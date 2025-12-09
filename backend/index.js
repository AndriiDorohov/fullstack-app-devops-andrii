/**
 * Головний файл серверної частини додатку
 * Реалізує REST API для отримання поточного часу з бази даних PostgreSQL
 */

// Імпортуємо необхідні модулі
const express = require("express"); // Веб-фреймворк для Node.js
const { Client } = require("pg");   // Драйвер для роботи з PostgreSQL
const app = express();              // Створюємо екземпляр Express додатку
const port = process.env.PORT || 3001; // Backend server port

// Ініціалізація з'єднання з базою даних
const db = new Client({
    connectionString: process.env.DATABASE_URL // Отримуємо URL-підключення з змінних середовища
});
db.connect(); // Підключаємося до бази даних

// Додаємо CORS middleware для дозволу крос-доменних запитів
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');                 // Дозволяємо запити з будь-якого джерела
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Дозволяємо вказані HTTP методи
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');     // Дозволяємо заголовок Content-Type
    next(); // Передаємо керування наступному middleware
});

// Додаємо маршрут для кореневого URL
app.get("/", (req, res) => {
    res.send("Backend API працює! Відвідайте /api для отримання часу з бази даних.");
});

app.get("/api", async (req, res) => {
    try {
        // Виконуємо SQL-запит для отримання поточного часу з бази даних
        const result = await db.query("SELECT NOW()");
        // Відправляємо результат у форматі JSON
        res.json({ time: result.rows[0].now });
    } catch (error) {
        // Обробка помилок при виконанні запиту
        console.error("Помилка при виконанні запиту:", error);
        res.status(500).json({ error: "Помилка сервера" });
    }
});

// Виводимо інформацію про підключення до БД
console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Функція для підключення до бази даних з повторними спробами
async function connectWithRetry(maxRetries = 10, delay = 5000) {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            console.log(`Спроба підключення до бази даних (${retries + 1}/${maxRetries})...`);
            const client = new Client({ connectionString: process.env.DATABASE_URL });
            await client.connect();
            console.log("Успішне підключення до бази даних!");

            // Перевірка бази даних
            const testResult = await client.query('SELECT current_database() as db_name');
            console.log("Підключено до бази даних:", testResult.rows[0].db_name);

            return client;
        } catch (err) {
            console.error("Помилка підключення до бази даних:", err.message);
            retries++;
            if (retries >= maxRetries) {
                console.error("Досягнуто максимальної кількості спроб. Не вдалося підключитися до бази даних.");
                throw err;
            }
            console.log(`Повторна спроба через ${delay / 1000} секунд...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Запускаємо сервер, потім намагаємося підключитися до БД
app.listen(port, () => {
    console.log("Backend running");

    // Підключення до бази даних з повторними спробами
    connectWithRetry()
        .then(client => {
            // Зберігаємо клієнт для використання в запитах
            app.locals.dbClient = client;

            // Налаштовуємо API ендпоінт після успішного підключення
            app.get("/api", async (req, res) => {
                try {
                    const result = await app.locals.dbClient.query("SELECT NOW()");
                    res.json({ time: result.rows[0].now });
                } catch (err) {
                    console.error("Помилка запиту до бази даних:", err);
                    res.status(500).json({ error: "Помилка бази даних" });
                }
            });
        })
        .catch(err => {
            console.error("Не вдалося запустити додаток через помилку бази даних:", err);
        });
});
