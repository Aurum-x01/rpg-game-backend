const express = require('express')
const db = require('./db')
const cors = require("cors")

const app = express()
app.use(cors())
app.use(express.json())


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
    const { id } = req.params
    try {
        const [rows] = await db.query('SELECT * FROM characters where id=?', [id])
        res.json(rows)
    } catch (err) {
        next(err)
    }
})

app.post('/add_new_characters', async (req, res, next) => {
    try {
        const { name, level, hp, max_hp } = req.body

        const [name_check] = await db.query(
            'SELECT name FROM characters WHERE name = ?',
            [name]
        )

        if (name_check.length > 0) {
            return res.status(400).json({
                message: 'Postać o tej nazwie już istnieje'
            })
        }

        const [result] = await db.query(
            `INSERT INTO characters (name, level, hp, max_hp)
             VALUES (?, ?, ?, ?)`,
            [name, level, hp, max_hp]
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

        await db.query(
            `UPDATE characters
             SET name = ?, level = ?, hp = ?, max_hp = ?, x = ?, y = ?, z = ?, gracz = ?
             WHERE id = ?`,
            [name, level, hp, max_hp, x, y, z, gracz, id]
        )

        res.json({
            message: 'Zmieniono dane postaci'
        })
    } catch (err) {
        next(err)
    }
})

app.delete('/delete_characters/:id', async (req, res, next) => {
    try {
        const { id } = req.params

        await db.query(
            'DELETE FROM characters WHERE id = ?',
            [id]
        )

        res.json({
            message: 'Usunięto postać'
        })
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
    const { id } = req.params
    try {
        const [rows] = await db.query('SELECT * from item_definitions where id = ?', [id])
        res.json(rows)

    } catch (err) {
        next(err)
    }
})


app.post('/add_new_item_definitions', async (req, res, next) => {
    try {
        const { name, type, base_value, stackable } = req.body

        const [name_check] = await db.query(
            'SELECT name FROM item_definitions WHERE name = ?',
            [name]

        )

        if (name_check.length > 0) {
            return res.status(400).json({
                message: 'Item o tej nazwie już istnieje'
            })
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


        await db.query(
            `UPDATE item_definitions
             SET name = ?, type = ?, base_value = ?, stackable = ?
             WHERE id = ?`,
            [name, type, base_value, stackable, id]
        )

        res.json({
            message: 'Zmieniono dane itemu'
        })
    } catch (err) {
        next(err)
    }
})

//=====================================================ITEM INSTENCES===========================================================
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
        const [rows] = await db.query('SELECT * FROM item_instances where id=?', [id])
        res.json(rows)
    } catch (err) {
        next(err)
    }
})

app.get('/item_instances/characters/:owner_characters_id/inventory', async (req, res, next) => {
    try {
        const { owner_characters_id } = req.params
        const [rows] = await db.query(
            `SELECT ii.id AS instance_id, c.name AS character_name,
            d.name AS item_name, d.type, ii.quantity
            FROM item_instances ii
            JOIN item_definitions d ON d.id = ii.item_definition_id
            JOIN characters c ON c.id = ii.owner_character_id
            WHERE c.id = ?`, [owner_characters_id])
    } catch (err) {
        next(err)
    }
})

app.post('/add_item_instances', async (req, res, next) => {
    try {
        const { item_definition_id, owner_characters_id, x, y, z, quantity } = req.body
        const [result] = await db.query('INSERT INTO item_instances (item_definition_id, owner_character_id,x , y, z, quantity) VALUES (?, ?, ?, ?, ?, ?)', [item_definition_id, owner_characters_id, x, y, z, quantity])
        res.status(201).json({
            message: 'Dodano nowy item do postaci',
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
        const [result] = await db.query('UPDATE item_instances SET owner_character_id = ?, x = NULL, y = NULL, z = NULL WHERE id = ? AND owner_character_id IS NULL', [owner_characters_id, id_item])

        if (result.affectedRows === 0) {
            return res.status(409).json({ error: "Przedmiot już istnieje" })
        } else {
            res.json({ message: "Zmieniono dane itemu" })
        }

    } catch (err) {
        next(err)
    }

})


app.patch('/update_item_instances/:id_item/drop', async (req, res, next) => {
    try {
        const { id_item } = req.params
        const { owner_characters_id } = req.body
        const [result] = await db.query('UPDATE item_instances JOIN characters ON item_instances.owner_character_id = characters.id SET item_instances.owner_character_id = NULL, item_instances.x=characters.x, item_instances.y=characters.y, item_instances.z=characters.z WHERE item_instances.id=? and owner_character_id=? and item_instances.x is NULL and item_instances.y is NULL and item_instances.z is NULL', [id_item, owner_characters_id])

        if (result.affectedRows === 0) {
            return res.status(409).json({ error: "NPC nie posiada tego przedmiotu" })
        } else {
            res.json({ message: "Zmieniono dane itemu" })
        }

    } catch (err) {
        next(err)
    }

})


app.delete('/delete_item_instances/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const { owner_characters_id } = req.body

        await db.query(
            `DELETE FROM item_instances
             WHERE id = ? AND owner_character_id = ?`,
            [id, owner_characters_id]
        )

        res.json({
            message: 'Usunięto przedmiot'
        })
    } catch (err) {
        next(err)
    }
})


app.use((err, req, res, next) => {
    console.error(err)
    if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'Rekord jest powiązany z innymi danymi' })
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Taki rekord już istnieje' })
    if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Nieprawidłowe dane' })
    res.status(500).json({ error: 'Wystąpił błąd serwera' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`http://localhost:${PORT}/`))
