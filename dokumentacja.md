# Dokumentacja modelu — RPG backend

## 1. Cel

Warstwa serwerowa odwzorowuje stan świata gry RPG: gdzie znajdują się postacie, jakie przedmioty istnieją i kto/co je posiada. Aplikacja kliencka i mechaniki rozgrywki (walka, questy) nie są przedmiotem tego modelu.

## 2. Byty

### Przedmiot — katalog (`item_definitions`)
Definicja *typu* przedmiotu: nazwa, kategoria (broń/zbroja/consumable/inne), bazowa wartość, czy przedmiot jest stakowalny. To "wzorzec", nie fizyczny obiekt w grze — np. "Miecz Żelazny" jako pojęcie istnieje raz, niezależnie od tego, ile jego egzemplarzy krąży po świecie.

### Przedmiot — instancja (`item_instances`)
Konkretny, fizyczny egzemplarz przedmiotu istniejący w danym momencie stanu gry. Odwołuje się do swojej definicji z katalogu i znajduje się dokładnie w jednym miejscu: albo w ekwipunku postaci, albo na konkretnych współrzędnych (x, y, z) w świecie. Ta dwuwarstwowość (katalog + instancja) pozwala uniknąć duplikowania danych o przedmiocie przy każdym jego wystąpieniu.

### Postać (`characters`)
Byt reprezentujący gracza lub NPC: nazwa, poziom, HP/maksymalne HP, pozycja w świecie (x, y, z) oraz flaga `gracz` (0 = NPC, 1 = postać gracza) rozróżniająca oba przypadki w ramach jednej tabeli. HP jest wartością trwałą (zmienia się w czasie w wyniku zdarzeń w grze), a nie wyliczaną — stąd przechowywana wprost w tabeli, a nie odtwarzana z innych danych.

### Lokalizacja — nie jest osobnym bytem
Świat gry jest modelowany jako ciągła przestrzeń współrzędnych (x, y, z), a nie zbiór dyskretnych, nazwanych miejsc. Dlatego "lokacja" nie ma własnej tabeli — jest atrybutem postaci i instancji przedmiotu (trójką kolumn `x`, `y`, `z`), a nie osobnym bytem z relacją. To świadoma decyzja: dodatkowa tabela `locations` byłaby zbędna, skoro pozycję da się w pełni opisać trzema liczbami.

## 3. Relacje

- **Postać** ma swoją pozycję zapisaną bezpośrednio jako `x`, `y`, `z` (bez klucza obcego do innej tabeli).
- **Instancja przedmiotu → Definicja przedmiotu**: każda instancja wskazuje na jeden wpis w katalogu (`item_instances.item_definition_id`).
- **Instancja przedmiotu → Postać LUB współrzędne**: instancja należy albo do postaci (leży w ekwipunku), albo ma własne `x`, `y`, `z` (leży na ziemi) — nigdy jedno i drugie naraz. Wymuszone przez `CHECK` w schemacie.

## 4. Kluczowe decyzje projektowe

- **Pozycja jako współrzędne, nie osobny byt.** Świat jest ciągły, więc reprezentowanie go jako zbioru nazwanych lokacji byłoby sztucznym ograniczeniem — trójka (x, y, z) w pełni opisuje pozycję i pozwala na dowolne, niezdefiniowane wcześniej miejsca w świecie.
- **Katalog vs instancja tylko dla przedmiotów.** Postać jest z natury jednostkowa (nie ma sensu rozdzielać "wzorca postaci" od "konkretnej postaci" na tym etapie), więc rozbudowywanie jej o tę samą dwuwarstwowość byłoby nieuzasadnionym rozdęciem schematu.
- **Brak osobnej tabeli ekwipunku.** Przynależność przedmiotu do postaci lub do współrzędnych jest zapisana bezpośrednio w `item_instances` (nullowalne kolumny + `CHECK`), zamiast tworzyć dodatkową tabelę łączącą.
- **Brak przechowywania kolekcji w jednej komórce.** Ekwipunek postaci czy przedmioty leżące na danych współrzędnych nie są zapisane jako lista/JSON w jednej kolumnie, tylko jako osobne wiersze w `item_instances` — zgodnie z zasadą normalizacji.
- **Zakres ograniczony do 2 tabel-bytów** (postać, przedmiot) — bez questów, walut czy klas postaci, żeby model pozostał zwarty i w pełni uzasadniony na tym etapie praktyk.
- **Gracz i NPC w jednej tabeli, rozróżnione flagą.** Zamiast dwóch odrębnych tabel (`players`, `npcs`) z duplikowaną strukturą, obie odmiany postaci współdzielą jedną tabelę `characters`, a flaga `gracz` (boolean) mówi, którym typem dany wiersz jest — mniej powtórzeń schematu, ta sama informacja.

## 5. Operacje API

Konwencja: dane wejściowe i wyjściowe wyłącznie w JSON, bez warstwy widoku. Odczyt przez `GET`, tworzenie przez `POST`, zmiana stanu przez `PATCH`, usuwanie przez `DELETE`.

### Postacie
- odczyt wszystkich postaci oraz pojedynczej po ID
- utworzenie nowej postaci, z kontrolą unikalności nazwy przed zapisem
- aktualizacja stanu postaci (poziom, HP, pozycja, flaga gracz/NPC)
- usunięcie postaci

### Katalog przedmiotów
- odczyt całego katalogu oraz pojedynczej definicji po ID
- dodanie nowej definicji przedmiotu, z kontrolą unikalności nazwy
- aktualizacja istniejącej definicji

### Instancje przedmiotów
- odczyt wszystkich egzemplarzy oraz pojedynczego po ID
- odczyt ekwipunku konkretnej postaci — zapytanie łączy (`JOIN`) instancję z jej definicją w katalogu oraz z postacią-właścicielem, dzięki czemu zwraca czytelne nazwy zamiast surowych identyfikatorów
- utworzenie nowego egzemplarza przedmiotu
- `pickup` — podniesienie przedmiotu leżącego na ziemi: ustawia właściciela i zeruje współrzędne
- `drop` — upuszczenie przedmiotu: zeruje właściciela i kopiuje aktualną pozycję postaci na przedmiot
- usunięcie egzemplarza (np. zużycie przedmiotu)

### Decyzje dotyczące kształtu API
- **`pickup` i `drop` jako osobne, nazwane operacje** zamiast ogólnego `PATCH` na całym rekordzie. Obie zmieniają kilka kolumn naraz w sposób, który musi pozostać spójny z regułą „przedmiot ma właściciela **albo** pozycję" — zamknięcie tego w jednej operacji po stronie API sprawia, że klient nie może doprowadzić do stanu naruszającego `CHECK` w bazie.
- **Warunki stanu wbudowane w `WHERE`** — `pickup` działa tylko na przedmiocie bez właściciela, `drop` tylko na przedmiocie, który dana postać faktycznie posiada. Jeśli warunek nie jest spełniony, żaden wiersz nie zostaje zmieniony i API zwraca `409 Conflict` zamiast po cichu zgłosić sukces.
- **Kontrola unikalności nazw przed `INSERT`** dla postaci i definicji przedmiotów — zwracany jest czytelny błąd zamiast duplikatu w bazie.
- **Parametryzowane zapytania (`?`) w każdym miejscu** — wartości z żądania nigdy nie są sklejane ze stringiem SQL, co eliminuje ryzyko SQL injection.
- **Wspólny middleware obsługi błędów** na końcu aplikacji przechwytuje wyjątki ze wszystkich endpointów i zwraca ujednoliconą odpowiedź `500`, zamiast ujawniać szczegóły techniczne.