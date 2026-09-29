-- ============================================================
-- RPG backend – schemat bazy + dane startowe
-- Import:  mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS rpg_game
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rpg_game;

DROP TABLE IF EXISTS item_instances;
DROP TABLE IF EXISTS item_definitions;
DROP TABLE IF EXISTS characters;

-- ------------------------------------------------------------
-- Postacie (gracze i NPC w jednej tabeli, rozróżnione flagą)
-- ------------------------------------------------------------
CREATE TABLE characters (
  id     INT          NOT NULL AUTO_INCREMENT,
  name   VARCHAR(100) NOT NULL,
  level  INT          NOT NULL DEFAULT 1,
  hp     INT          NOT NULL DEFAULT 100,
  max_hp INT          NOT NULL DEFAULT 100,
  x      INT          NOT NULL DEFAULT 0,
  y      INT          NOT NULL DEFAULT 0,
  z      INT          NOT NULL DEFAULT 0,
  gracz  TINYINT(1)   NOT NULL DEFAULT 1,   -- 1 = postać gracza, 0 = NPC
  PRIMARY KEY (id),
  UNIQUE KEY uq_characters_name (name),
  CONSTRAINT chk_characters_level CHECK (level >= 1),
  CONSTRAINT chk_characters_hp    CHECK (hp >= 0 AND hp <= max_hp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Katalog przedmiotów (definicje)
-- ------------------------------------------------------------
CREATE TABLE item_definitions (
  id         INT          NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  type       ENUM('weapon','armor','consumable','misc') NOT NULL DEFAULT 'misc',
  base_value INT          NOT NULL DEFAULT 0,
  stackable  TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_item_definitions_name (name),
  CONSTRAINT chk_item_definitions_value CHECK (base_value >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Instancje przedmiotów: albo w ekwipunku postaci, albo na ziemi (x,y,z)
-- ------------------------------------------------------------
CREATE TABLE item_instances (
  id                 INT NOT NULL AUTO_INCREMENT,
  item_definition_id INT NOT NULL,
  owner_character_id INT DEFAULT NULL,
  x                  INT DEFAULT NULL,
  y                  INT DEFAULT NULL,
  z                  INT DEFAULT NULL,
  quantity           INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_instances_definition (item_definition_id),
  KEY idx_instances_owner (owner_character_id),
  CONSTRAINT fk_instances_definition
    FOREIGN KEY (item_definition_id) REFERENCES item_definitions (id),
  CONSTRAINT fk_instances_owner
    FOREIGN KEY (owner_character_id) REFERENCES characters (id),
  CONSTRAINT chk_instances_quantity CHECK (quantity >= 1),
  -- przedmiot ma ALBO właściciela, ALBO pozycję – nigdy oba naraz i nigdy żadne
  CONSTRAINT chk_instances_owner_xor_position CHECK (
    (owner_character_id IS NOT NULL AND x IS NULL AND y IS NULL AND z IS NULL)
    OR
    (owner_character_id IS NULL AND x IS NOT NULL AND y IS NOT NULL AND z IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Dane startowe
-- ------------------------------------------------------------
INSERT INTO characters (id, name, level, hp, max_hp, x, y, z, gracz) VALUES
(1, 'Aurum',           1, 100, 100,   0,   0,  0, 1),
(2, 'Strażnik Lasu',   3,  67, 200,  15,  -4,  2, 0),
(3, 'Witch',           3, 150, 200, 120,  12, 25, 0);

INSERT INTO item_definitions (id, name, type, base_value, stackable) VALUES
(1, 'Miecz Żelazny',    'weapon',     50, 0),
(2, 'Zbroja Skórzana',  'armor',      40, 0),
(3, 'Mikstura Leczenia','consumable', 10, 1),
(4, 'Złota Moneta',     'misc',        1, 1),
(5, 'Zbroja Żelazna',   'armor',      50, 0),
(6, 'Łuk',              'weapon',     30, 0);

INSERT INTO item_instances (id, item_definition_id, owner_character_id, x, y, z, quantity) VALUES
(1, 1, 1,    NULL, NULL, NULL,  1),   -- Aurum: Miecz Żelazny
(2, 3, 1,    NULL, NULL, NULL,  2),   -- Aurum: 2x Mikstura Leczenia
(3, 4, NULL, 120,  12,   25,   25),   -- na ziemi: 25x Złota Moneta
(4, 5, NULL, 125,  5,    55,    1),   -- na ziemi: Zbroja Żelazna
(5, 2, 1,    NULL, NULL, NULL,  1),   -- Aurum: Zbroja Skórzana
(6, 6, 2,    NULL, NULL, NULL,  1);   -- Strażnik Lasu: Łuk