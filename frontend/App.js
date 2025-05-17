/**
 * Головний компонент React додатку
 * Відображає час, отриманий з бекенду, у красивому інтерфейсі
 */

import { useEffect, useState } from "react"; // Хуки React для стану та ефектів
import './App.css';                          // Імпорт стилів для компонента

function App() {
    // Стан для зберігання даних про час з бекенду
    const [data, setData] = useState("Loading...");

    // Стан для відстеження процесу завантаження даних
    const [loading, setLoading] = useState(true);

    // Стан для відстеження помилок під час запиту
    const [error, setError] = useState(false);

    // Ефект, який виконується після рендерингу компонента
    useEffect(() => {
        // Функція для отримання даних з бекенду
        const fetchData = async () => {
            try {
                setLoading(true); // Встановлюємо стан завантаження

                // Спробуємо кілька варіантів URL для підключення до бекенду
                const urls = [
                    '/api',                                    // Відносний шлях через proxy
                    'http://localhost:3000/api',               // Локальний хост
                    'http://backend:3000/api',                 // Docker сервіс
                    window.location.origin.replace('80', '3000') + '/api'  // Заміна порту
                ];

                console.log("Trying URLs:", urls);
                let connected = false;
                let finalResult = null;

                // Перевіряємо всі можливі URL послідовно
                for (const url of urls) {
                    if (connected) break; // Якщо вже підключилися, виходимо з циклу

                    try {
                        console.log("Trying URL:", url);
                        // Виконуємо запит з CORS-опціями
                        const response = await fetch(url, {
                            mode: 'cors',
                            headers: { 'Content-Type': 'application/json' },
                            method: 'GET'
                        });

                        // Якщо отримали успішну відповідь
                        if (response.ok) {
                            const result = await response.json();
                            console.log("Success with URL:", url, "Data:", result);
                            finalResult = result;
                            connected = true;
                            break;
                        }
                    } catch (e) {
                        // Логуємо помилку для конкретного URL
                        console.log(`Failed with URL ${url}:`, e.message);
                    }
                }

                // Обробляємо результат, якщо з'єднання було успішним
                if (connected && finalResult) {
                    setData(finalResult.time); // Зберігаємо час у стані
                    setError(false);           // Скидаємо стан помилки
                } else {
                    // Якщо всі спроби невдалі, викидаємо помилку
                    throw new Error("All connection attempts failed");
                }

                setLoading(false); // Завершуємо стан завантаження
            } catch (error) {
                // Обробка помилок
                console.error("Error fetching data:", error);
                setError(true);     // Встановлюємо стан помилки
                setLoading(false);  // Завершуємо стан завантаження
            }
        };

        // Викликаємо функцію отримання даних
        fetchData();

        // Налаштовуємо періодичне оновлення даних кожні 8 секунд
        const interval = setInterval(fetchData, 8000);

        // Функція очищення, яка виконується при розмонтуванні компонента
        return () => clearInterval(interval);
    }, []); // Порожній масив залежностей означає, що ефект виконується тільки при монтуванні

    // Рендеринг компонента
    return (
        <div className="container">
            <div className="card">
                {/* Анімований елемент-пульсація */}
                <div className="pulse"></div>

                {/* Заголовок з градієнтним текстом */}
                <h1 className="title">Docker <span className="highlight">Fullstack</span> App</h1>

                {/* Контейнер для годинника */}
                <div className="clock-container">
                    <div className={`clock ${loading ? 'loading' : ''}`}>
                        <div className="clock-face">
                            <div className="time">
                                {/* Показуємо помилку чи дані часу залежно від стану */}
                                {error ? "Couldn't connect to server" : data}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Підзаголовок */}
                <p className="subtitle">Час з PostgreSQL бази даних через Node.js API</p>

                {/* Технологічний стек */}
                <div className="tech-stack">
                    <div className="tech-item">React</div>
                    <div className="tech-item">Express</div>
                    <div className="tech-item">PostgreSQL</div>
                    <div className="tech-item">Docker</div>
                </div>
            </div>
        </div>
    );
}

export default App; 