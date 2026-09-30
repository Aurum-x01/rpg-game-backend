require('dotenv').config()
const express = require('express')
const db = require('./db')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())


app.param('id', (req, res, next, id) => {
    if (!Number.isInteger(Number(id))) {
        return res.status(400).json({ error: 'Nieprawidłowe id' })
    }
    next()
})

app.param('id_item', (req, res, next, id) => {
    if (!Number.isInteger(Number(id))) {
        return res.status(400).json({ error: 'Nieprawidłowe id' })
    }
    next()
})

app.param('owner_characters_id', (req, res, next, id) => {
    if (!Number.isInteger(Number(id))) {
        return res.status(400).json({ error: 'Nieprawidłowe id' })
    }
    next()
})

//=================================ENDPOINTS CHARACTERS==============================================
app.get('/characters', async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM characters')
        res.json(rows)
    } catch (err) {
        next(err)
    }
})

app.get('/characters/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const [rows] = await db.query('SELECT * FROM characters WHERE id = ?', [id])
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Nie znaleziono postaci' })
        }
        res.json(rows[0])
    } catch (err) {
        next(err)
    }
})

app.post('/add_new_characters', async (req, res, next) => {
    try {
        const { name, level = 1, hp = 100, max_hp = 100, x = 0, y = 0, z = 0, gracz = 1 } = req.body

        if (typeof name !== 'string' || name.trim() === '' || name.length > 100) {
            return res.status(400).json({ error: 'name musi być niepustym tekstem (max 100 znaków)' })
        }

        for (const value of [level, hp, max_hp, x, y, z]) {
            if (!Number.isInteger(value)) {
                return res.status(400).json({ error: 'level, hp, max_hp, x, y, z muszą być liczbami całkowitymi' })
            }
        }

        if (gracz !== 0 && gracz !== 1) {
            return res.status(400).json({ error: 'gracz musi mieć wartość 0 lub 1' })
        }

        const [name_check] = await db.query(
            'SELECT id FROM characters WHERE name = ?',
            [name]
        )

        if (name_check.length > 0) {
            return res.status(409).json({ error: 'Postać o tej nazwie już istnieje' })
        }

        const [result] = await db.query(
            `INSERT INTO characters (name, level, hp, max_hp, x, y, z, gracz)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, level, hp, max_hp, x, y, z, gracz]
        )

        res.status(201).json({
            message: 'Dodano nową postać',
            id: result.insertId
        })
    } catch (err) {
        next(err)
    }
})

app.patch('/update_characters/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const { name, level, hp, max_hp, x, y, z, gracz } = req.body

        if (name !== undefined && (typeof name !== 'string' || name.trim() === '' || name.length > 100)) {
            return res.status(400).json({ error: 'name musi być niepustym tekstem (max 100 znaków)' })
        }

        for (const value of [level, hp, max_hp, x, y, z]) {
            if (value !== undefined && !Number.isInteger(value)) {
                return res.status(400).json({ error: 'level, hp, max_hp, x, y, z muszą być liczbami całkowitymi' })
            }
        }

        if (gracz !== undefined && gracz !== 0 && gracz !== 1) {
            return res.status(400).json({ error: 'gracz musi mieć wartość 0 lub 1' })
        }

        const [result] = await db.query(
            `UPDATE characters
             SET name = COALESCE(?, name),
                 level = COALESCE(?, level),
                 hp = COALESCE(?, hp),
                 max_hp = COALESCE(?, max_hp),
                 x = COALESCE(?, x),
                 y = COALESCE(?, y),
                 z = COALESCE(?, z),
                 gracz = COALESCE(?, gracz)
             WHERE id = ?`,
            [
                name ?? null,
                level ?? null,
                hp ?? null,
                max_hp ?? null,
                x ?? null,
                y ?? null,
                z ?? null,
                gracz ?? null,
                id
            ]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Nie znaleziono postaci' })
        }

        res.json({ message: 'Zmieniono dane postaci' })
    } catch (err) {
        next(err)
    }
})

app.delete('/delete_characters/:id', async (req, res, next) => {
    try {
        const { id } = req.params

        const [result] = await db.query('DELETE FROM characters WHERE id = ?', [id])

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Nie znaleziono postaci' })
        }

        res.json({ message: 'Usunięto postać' })
    } catch (err) {
        next(err)
    }
})

//====================================ENDPOINTS item_definitions===============================================
app.get('/item_definitions', async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM item_definitions')
        res.json(rows)
    } catch (err) {
        next(err)
    }
})

app.get('/item_definitions/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const [rows] = await db.query('SELECT * FROM item_definitions WHERE id = ?', [id])
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Nie znaleziono definicji przedmiotu' })
        }
        res.json(rows[0])
    } catch (err) {
        next(err)
    }
})

app.post('/add_new_item_definitions', async (req, res, next) => {
    try {
        const { name, type, base_value = 0, stackable = 0 } = req.body

        if (typeof name !== 'string' || name.trim() === '' || name.length > 100) {
            return res.status(400).json({ error: 'name musi być niepustym tekstem (max 100 znaków)' })
        }

        if (!['weapon', 'armor', 'consumable', 'misc'].includes(type)) {
            return res.status(400).json({ error: 'type musi być: weapon, armor, consumable lub misc' })
        }

        if (!Number.isInteger(base_value)) {
            return res.status(400).json({ error: 'base_value musi być liczbą całkowitą' })
        }

        if (stackable !== 0 && stackable !== 1) {
            return res.status(400).json({ error: 'stackable musi mieć wartość 0 lub 1' })
        }

        const [name_check] = await db.query(
            'SELECT id FROM item_definitions WHERE name = ?',
            [name]
        )

        if (name_check.length > 0) {
            return res.status(409).json({ error: 'Item o tej nazwie już istnieje' })
        }

        const [result] = await db.query(
            `INSERT INTO item_definitions (name, type, base_value, stackable)
             VALUES (?, ?, ?, ?)`,
            [name, type, base_value, stackable]
        )

        res.status(201).json({
            message: 'Dodano nowy item',
            id: result.insertId
        })
    } catch (err) {
        next(err)
    }
})

app.patch('/update_item_definitions/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const { name, type, base_value, stackable } = req.body

        if (name !== undefined && (typeof name !== 'string' || name.trim() === '' || name.length > 100)) {
            return res.status(400).json({ error: 'name musi być niepustym tekstem (max 100 znaków)' })
        }

        if (type !== undefined && !['weapon', 'armor', 'consumable', 'misc'].includes(type)) {
            return res.status(400).json({ error: 'type musi być: weapon, armor, consumable lub misc' })
        }

        if (base_value !== undefined && !Number.isInteger(base_value)) {
            return res.status(400).json({ error: 'base_value musi być liczbą całkowitą' })
        }

        if (stackable !== undefined && stackable !== 0 && stackable !== 1) {
            return res.status(400).json({ error: 'stackable musi mieć wartość 0 lub 1' })
        }

        if (stackable === 0) {
            const [stacks] = await db.query(
                'SELECT id FROM item_instances WHERE item_definition_id = ? AND quantity > 1',
                [id]
            )

            if (stacks.length > 0) {
                return res.status(409).json({ error: 'Istnieją stosy tego przedmiotu, nie można wyłączyć stackable' })
            }
        }

        const [result] = await db.query(
            `UPDATE item_definitions
             SET name = COALESCE(?, name),
                 type = COALESCE(?, type),
                 base_value = COALESCE(?, base_value),
                 stackable = COALESCE(?, stackable)
             WHERE id = ?`,
            [
                name ?? null,
                type ?? null,
                base_value ?? null,
                stackable ?? null,
                id
            ]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Nie znaleziono definicji przedmiotu' })
        }

        res.json({ message: 'Zmieniono dane itemu' })
    } catch (err) {
        next(err)
    }
})

//=====================================================ITEM INSTANCES===========================================================
app.get('/item_instances', async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM item_instances')
        res.json(rows)
    } catch (err) {
        next(err)
    }
})

app.get('/item_instances/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const [rows] = await db.query('SELECT * FROM item_instances WHERE id = ?', [id])
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Nie znaleziono instancji przedmiotu' })
        }
        res.json(rows[0])
    } catch (err) {
        next(err)
    }
})

app.get('/item_instances/characters/:owner_characters_id/inventory', async (req, res, next) => {
    try {
        const { owner_characters_id } = req.params

        const [characters] = await db.query('SELECT id FROM characters WHERE id = ?', [owner_characters_id])
        if (characters.length === 0) {
            return res.status(404).json({ error: 'Nie znaleziono postaci' })
        }

        const [rows] = await db.query(
            `SELECT ii.id AS instance_id, c.name AS character_name,
                    d.name AS item_name, d.type, ii.quantity
             FROM item_instances ii
             JOIN item_definitions d ON d.id = ii.item_definition_id
             JOIN characters c ON c.id = ii.owner_character_id
             WHERE c.id = ?`,
            [owner_characters_id]
        )
        res.json(rows)
    } catch (err) {
        next(err)
    }
})

app.post('/add_item_instances', async (req, res, next) => {
    try {
        const { item_definition_id, owner_characters_id = null, x = null, y = null, z = null, quantity = 1 } = req.body

        if (!Number.isInteger(item_definition_id) || !Number.isInteger(quantity)) {
            return res.status(400).json({ error: 'item_definition_id i quantity muszą być liczbami całkowitymi' })
        }

        if (quantity < 1) {
            return res.status(400).json({ error: 'quantity musi być większe od 0' })
        }

        if (owner_characters_id !== null && !Number.isInteger(owner_characters_id)) {
            return res.status(400).json({ error: 'owner_characters_id musi być liczbą całkowitą' })
        }

        for (const value of [x, y, z]) {
            if (value !== null && !Number.isInteger(value)) {
                return res.status(400).json({ error: 'x, y, z muszą być liczbami całkowitymi' })
            }
        }

        const hasOwner = owner_characters_id !== null
        const hasAnyCoord = x !== null || y !== null || z !== null
        const hasFullPosition = x !== null && y !== null && z !== null

        if (hasOwner && hasAnyCoord) {
            return res.status(400).json({ error: 'Przedmiot ma mieć właściciela albo współrzędne, nie oba naraz' })
        }

        if (!hasOwner && !hasFullPosition) {
            return res.status(400).json({ error: 'Podaj właściciela albo współrzędne x, y, z' })
        }

        const [definition] = await db.query(
            'SELECT stackable FROM item_definitions WHERE id = ?',
            [item_definition_id]
        )

        if (definition.length === 0) {
            return res.status(404).json({ error: 'Nie ma takiej definicji przedmiotu' })
        }

        if (definition[0].stackable === 0 && quantity > 1) {
            return res.status(400).json({ error: 'Ten przedmiot nie jest stakowalny, quantity musi wynosić 1' })
        }

        const [result] = await db.query(
            `INSERT INTO item_instances (item_definition_id, owner_character_id, x, y, z, quantity)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [item_definition_id, owner_characters_id, x, y, z, quantity]
        )

        res.status(201).json({
            message: 'Dodano nowy item',
            id: result.insertId
        })
    } catch (err) {
        next(err)
    }
})

app.patch('/update_item_instances/:id_item/pickup', async (req, res, next) => {
    try {
        const { id_item } = req.params
        const { owner_characters_id } = req.body

        if (!Number.isInteger(owner_characters_id)) {
            return res.status(400).json({ error: 'owner_characters_id musi być liczbą całkowitą' })
        }

        const [characters] = await db.query('SELECT id FROM characters WHERE id = ?', [owner_characters_id])
        if (characters.length === 0) {
            return res.status(404).json({ error: 'Nie znaleziono postaci' })
        }

        const [result] = await db.query(
            `UPDATE item_instances
             SET owner_character_id = ?, x = NULL, y = NULL, z = NULL
             WHERE id = ? AND owner_character_id IS NULL`,
            [owner_characters_id, id_item]
        )

        if (result.affectedRows === 0) {
            return res.status(409).json({ error: 'Przedmiot ma już właściciela lub nie istnieje' })
        }

        res.json({ message: 'Podniesiono przedmiot' })
    } catch (err) {
        next(err)
    }
})

app.patch('/update_item_instances/:id_item/drop', async (req, res, next) => {
    try {
        const { id_item } = req.params
        const { owner_characters_id } = req.body

        if (!Number.isInteger(owner_characters_id)) {
            return res.status(400).json({ error: 'owner_characters_id musi być liczbą całkowitą' })
        }

        const [result] = await db.query(
            `UPDATE item_instances
             JOIN characters ON item_instances.owner_character_id = characters.id
             SET item_instances.owner_character_id = NULL,
                 item_instances.x = characters.x,
                 item_instances.y = characters.y,
                 item_instances.z = characters.z
             WHERE item_instances.id = ? AND item_instances.owner_character_id = ?`,
            [id_item, owner_characters_id]
        )

        if (result.affectedRows === 0) {
            return res.status(409).json({ error: 'Postać nie posiada tego przedmiotu' })
        }

        res.json({ message: 'Upuszczono przedmiot' })
    } catch (err) {
        next(err)
    }
})

app.delete('/delete_item_instances/:id', async (req, res, next) => {
    try {
        const { id } = req.params

        const [result] = await db.query('DELETE FROM item_instances WHERE id = ?', [id])

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Nie znaleziono przedmiotu' })
        }

        res.json({ message: 'Usunięto przedmiot' })
    } catch (err) {
        next(err)
    }
})

//=====================================================ERROR HANDLER===========================================================
app.use((err, req, res, next) => {
    console.error(err)
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Nieprawidłowy JSON' })
    if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'Rekord jest powiązany z innymi danymi' })
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Taki rekord już istnieje' })
    if (
        err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' ||
        err.code === 'ER_CONSTRAINT_FAILED' ||
        err.code === 'ER_NO_REFERENCED_ROW_2'
    ) return res.status(400).json({ error: 'Nieprawidłowe dane' })
    res.status(500).json({ error: 'Wystąpił błąd serwera' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`http://localhost:${PORT}/`))