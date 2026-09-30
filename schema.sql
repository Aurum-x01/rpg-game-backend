-- RPG backend: schemat bazy i dane startowe (MySQL 8.0.16+)
-- Import: mysql -u root -p < schema.sql
-- Uwaga: skrypt kasuje i tworzy tabele od nowa (reset danych).

CREATE DATABASE IF NOT EXISTS `rpg_game`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `rpg_game`;

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `item_instances`;
DROP TABLE IF EXISTS `item_definitions`;
DROP TABLE IF EXISTS `characters`;

-- Postacie (gracze i NPC w jednej tabeli, rozróżnione flagą gracz)
CREATE TABLE `characters` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `level` INT NOT NULL DEFAULT 1,
  `hp` INT NOT NULL DEFAULT 100,
  `max_hp` INT NOT NULL DEFAULT 100,
  `x` INT NOT NULL DEFAULT 0,
  `y` INT NOT NULL DEFAULT 0,
  `z` INT NOT NULL DEFAULT 0,
  `gracz` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_characters_name` (`name`),
  CONSTRAINT `chk_characters_name` CHECK (TRIM(`name`) <> ''),
  CONSTRAINT `chk_characters_level` CHECK (`level` >= 1),
  CONSTRAINT `chk_characters_max_hp` CHECK (`max_hp` > 0),
  CONSTRAINT `chk_characters_hp` CHECK (`hp` >= 0 AND `hp` <= `max_hp`),
  CONSTRAINT `chk_characters_gracz` CHECK (`gracz` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Katalog przedmiotów (definicje)
CREATE TABLE `item_definitions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('weapon','armor','consumable','misc') NOT NULL DEFAULT 'misc',
  `base_value` INT NOT NULL DEFAULT 0,
  `stackable` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_item_definitions_name` (`name`),
  CONSTRAINT `chk_item_definitions_name` CHECK (TRIM(`name`) <> ''),
  CONSTRAINT `chk_item_definitions_base_value` CHECK (`base_value` >= 0),
  CONSTRAINT `chk_item_definitions_stackable` CHECK (`stackable` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Instancje przedmiotów: albo w ekwipunku postaci, albo na współrzędnych w świecie
CREATE TABLE `item_instances` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `item_definition_id` INT NOT NULL,
  `owner_character_id` INT DEFAULT NULL,
  `x` INT DEFAULT NULL,
  `y` INT DEFAULT NULL,
  `z` INT DEFAULT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `item_definition_id` (`item_definition_id`),
  KEY `owner_character_id` (`owner_character_id`),
  CONSTRAINT `item_instances_ibfk_1` FOREIGN KEY (`item_definition_id`) REFERENCES `item_definitions` (`id`),
  CONSTRAINT `item_instances_ibfk_2` FOREIGN KEY (`owner_character_id`) REFERENCES `characters` (`id`),
  CONSTRAINT `chk_owner_or_position` CHECK (
    (`owner_character_id` IS NOT NULL AND `x` IS NULL AND `y` IS NULL AND `z` IS NULL)
    OR
    (`owner_character_id` IS NULL AND `x` IS NOT NULL AND `y` IS NOT NULL AND `z` IS NOT NULL)
  ),
  CONSTRAINT `chk_quantity_positive` CHECK (`quantity` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dane startowe
INSERT INTO `characters` (`id`, `name`, `level`, `hp`, `max_hp`, `x`, `y`, `z`, `gracz`) VALUES
(1, 'Aurum', 1, 100, 100, 0, 0, 0, 1),
(2, 'Strażnik Lasu', 3, 67, 200, 15, -4, 2, 0),
(3, 'Witch', 3, 150, 200, 120, 12, 25, 0);

INSERT INTO `item_definitions` (`id`, `name`, `type`, `base_value`, `stackable`) VALUES
(1, 'Miecz Żelazny', 'weapon', 50, 0),
(2, 'Zbroja Skórzana', 'armor', 40, 0),
(3, 'Mikstura Leczenia', 'consumable', 10, 1),
(4, 'Złota Moneta', 'misc', 1, 1),
(5, 'Zbroja Żelazna', 'armor', 50, 0),
(6, 'Łuk', 'weapon', 30, 0);

INSERT INTO `item_instances` (`id`, `item_definition_id`, `owner_character_id`, `x`, `y`, `z`, `quantity`) VALUES
(1, 1, 1, NULL, NULL, NULL, 1),
(2, 3, 1, NULL, NULL, NULL, 2),
(3, 4, NULL, 120, 12, 25, 25),
(4, 5, NULL, 125, 5, 55, 1),
(5, 2, 1, NULL, NULL, NULL, 1),
(6, 6, 2, NULL, NULL, NULL, 1);