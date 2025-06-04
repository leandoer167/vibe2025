const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'todolist',
};

async function retrieveListItems() {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, text FROM items');
    await connection.end();
    return rows;
}

async function addItem(text) {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('INSERT INTO items (text) VALUES (?)', [text]);
    await connection.end();
}

async function deleteItem(id) {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('DELETE FROM items WHERE id = ?', [id]);
    await connection.end();
}

async function updateItem(id, newText) {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('UPDATE items SET text = ? WHERE id = ?', [newText, id]);
    await connection.end();
}

// Обновим getHtmlRows
async function getHtmlRows(editId = null) {
    const todoItems = await retrieveListItems();

    return todoItems.map((item, index) => {
        const displayNumber = index + 1;

        if (String(item.id) === String(editId)) {
            return `
                <tr>
                    <td>${displayNumber}</td>
                    <td>
                        <form method="POST" action="/edit">
                            <input type="hidden" name="id" value="${item.id}" />
                            <input type="text" name="text" value="${item.text}" required />
                            <button type="submit">Save</button>
                        </form>
                    </td>
                    <td><a href="/">Cancel</a></td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td>${displayNumber}</td>
                    <td>${item.text}</td>
                    <td>
                        <form method="POST" action="/delete" style="display:inline;">
                            <input type="hidden" name="id" value="${item.id}" />
                            <button type="submit">×</button>
                        </form>
                        <form method="GET" action="/" style="display:inline;">
                            <input type="hidden" name="edit" value="${item.id}" />
                            <button type="submit">Edit</button>
                        </form>
                    </td>
                </tr>
            `;
        }
    }).join('');
}

// Обновим handleRequest
async function handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const editId = url.searchParams.get('edit');

    if (req.method === 'GET' && pathname === '/') {
        try {
            const html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
            const processedHtml = html.replace('{{rows}}', await getHtmlRows(editId));
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500);
            res.end('Internal Server Error');
        }

    } else if (req.method === 'POST' && pathname === '/add') {
        const { text } = await parseRequestBody(req);
        if (text) await addItem(text);
        res.writeHead(302, { Location: '/' });
        res.end();

    } else if (req.method === 'POST' && pathname === '/delete') {
        const { id } = await parseRequestBody(req);
        if (id) await deleteItem(id);
        res.writeHead(302, { Location: '/' });
        res.end();

    } else if (req.method === 'POST' && pathname === '/edit') {
        const { id, text } = await parseRequestBody(req);
        if (id && text) await updateItem(id, text);
        res.writeHead(302, { Location: '/' });
        res.end();

    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
}

async function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const parsed = {};
            for (const [key, value] of params.entries()) {
                parsed[key] = value;
            }
            resolve(parsed);
        });
    });
}



http.createServer(handleRequest).listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
);
