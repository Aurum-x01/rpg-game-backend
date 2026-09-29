# RPG Backend

Backend (Node.js + Express + MySQL) odwzorowujący stan świata gry typu RPG: postacie, katalog przedmiotów oraz egzemplarze przedmiotów (w ekwipunku lub leżące w świecie). API zwraca wyłącznie JSON.

Projekt wykonany w ramach praktyk zawodowych. Opis decyzji projektowych: [`DOKUMENTACJA.md`](DOKUMENTACJA.md).

## Wymagania

- [Node.js](https://nodejs.org/) 18 lub nowszy (razem z npm)
- [MySQL](https://dev.mysql.com/downloads/) 8.0.16+ (CHECK constraints są egzekwowane od tej wersji; MariaDB 10.4+ również działa)
- Git

## Instalacja i uruchomienie

### 1. Pobierz projekt

```bash
git clone https://github.com/Aurum-x01/rpg-game-backend.git
cd rpg-game-backend
```

### 2. Zainstaluj zależności

```bash
npm install
```

### 3. Utwórz bazę danych i dane startowe

Upewnij się, że serwer MySQL działa, a następnie zaimportuj `schema.sql`. Plik sam tworzy bazę `rpg_game`, tabele oraz dane początkowe.

(Zaimportuj `schema.sql` w phpMyAdmin / MySQL Workbench, zakładka *Import* / *Run SQL Script*.)

### 4. Skonfiguruj połączenie

Skopiuj plik przykładowej konfiguracji i uzupełnij dane dostępowe:

```bash
# Linux / macOS / Git Bash
cp .env.example .env

# Windows (cmd)
copy .env.example .env
```

Zawartość `.env`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=twoje_haslo
DB_NAME=rpg_game
PORT=3000
```

### 5. Uruchom API

```bash
npm start
```

Po poprawnym starcie w konsoli pojawi się `http://localhost:3000/`. Szybki test:

```bash
curl http://localhost:3000/characters
```

## Model danych

| Tabela | Opis |
|---|---|
| `characters` | Gracze i NPC (flaga `gracz`: 1 = gracz, 0 = NPC), HP, poziom, pozycja `x, y, z` |
| `item_definitions` | Katalog przedmiotów: nazwa, typ (`weapon`, `armor`, `consumable`, `misc`), wartość, `stackable` |
| `item_instances` | Konkretne egzemplarze przedmiotów. Każdy ma **albo** właściciela (`owner_character_id`), **albo** pozycję (`x, y, z`) – wymuszone przez `CHECK` |

Relacje: `item_instances.item_definition_id → item_definitions.id`, `item_instances.owner_character_id → characters.id`.

## Endpointy

### Postacie

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/characters` | Lista wszystkich postaci |
| GET | `/characters/:id` | Pojedyncza postać |
| POST | `/add_new_characters` | Nowa postać (`name`, `level`, `hp`, `max_hp`) |
| PATCH | `/update_characters/:id` | Zmiana stanu postaci (`name`, `level`, `hp`, `max_hp`, `x`, `y`, `z`, `gracz`) |
| DELETE | `/delete_characters/:id` | Usunięcie postaci |

### Katalog przedmiotów

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/item_definitions` | Cały katalog |
| GET | `/item_definitions/:id` | Pojedyncza definicja |
| POST | `/add_new_item_definitions` | Nowa definicja (`name`, `type`, `base_value`, `stackable`) |
| PATCH | `/update_item_definitions/:id` | Zmiana definicji |

### Instancje przedmiotów

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/item_instances` | Wszystkie egzemplarze |
| GET | `/item_instances/:id` | Pojedynczy egzemplarz |
| GET | `/item_instances/characters/:owner_characters_id/inventory` | Ekwipunek postaci (z nazwami przedmiotów) |
| POST | `/add_item_instances` | Nowy egzemplarz (`item_definition_id`, `owner_characters_id` **albo** `x, y, z`, `quantity`) |
| PATCH | `/update-item-instances/:id_item/pickup` | Podniesienie przedmiotu z ziemi (`owner_characters_id`) |
| PATCH | `/update-item-instances/:id_item/drop` | Upuszczenie przedmiotu na pozycji postaci (`owner_characters_id`) |
| DELETE | `/delete-item-instances/:id` | Usunięcie egzemplarza (`owner_characters_id` w body) |

Kody odpowiedzi: `200`/`201` – sukces, `400` – błędne dane lub duplikat nazwy, `409` – konflikt stanu (np. przedmiot już ma właściciela), `500` – błąd serwera.

## Przykładowe wywołania

**Dodanie postaci**

```bash
curl -X POST http://localhost:3000/add_new_characters \
  -H "Content-Type: application/json" \
  -d '{"name":"Gandalf","level":10,"hp":300,"max_hp":300}'
```

Odpowiedź:

```json
{ "message": "Dodano nową postać", "id": 4 }
```

**Ekwipunek postaci Aurum (id = 1)**

```bash
curl http://localhost:3000/item_instances/characters/1/inventory
```

Odpowiedź:

```json
[
  { "instance_id": 1, "character_name": "Aurum", "item_name": "Miecz Żelazny", "type": "weapon", "quantity": 1 },
  { "instance_id": 2, "character_name": "Aurum", "item_name": "Mikstura Leczenia", "type": "consumable", "quantity": 2 }
]
```

**Podniesienie przedmiotu leżącego na ziemi (id = 3) przez postać 1**

```bash
curl -X PATCH http://localhost:3000/update-item-instances/3/pickup \
  -H "Content-Type: application/json" \
  -d '{"owner_characters_id":1}'
```

Jeśli przedmiot ma już właściciela, API zwróci `409 Conflict`.

**Upuszczenie przedmiotu (id = 3) przez postać 1**

```bash
curl -X PATCH http://localhost:3000/update-item-instances/3/drop \
  -H "Content-Type: application/json" \
  -d '{"owner_characters_id":1}'
```

Przedmiot trafia na aktualną pozycję postaci (`x, y, z`), a właściciel zostaje wyzerowany.

## Struktura projektu

```
.
├── index.js          # API (Express) – główny plik aplikacji
├── db.js             # pula połączeń MySQL
├── schema.sql        # schemat + dane startowe
├── package.json
├── .env.example      # wzór konfiguracji (.env nie jest w repozytorium)
├── DOKUMENTACJA.md   # opis modelu i decyzji projektowych
└── README.md
```

## Rozwiązywanie problemów

- **`ECONNREFUSED` / `Access denied`** – sprawdź, czy MySQL działa oraz czy dane w `.env` (użytkownik, hasło, nazwa bazy) są poprawne.
- **`Unknown database 'rpg_game'`** – nie zaimportowano `schema.sql` (krok 3).
- **`EADDRINUSE`** – port jest zajęty; zmień `PORT` w `.env`.
