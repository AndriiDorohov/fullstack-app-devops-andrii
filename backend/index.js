const express = require('express');
const { Client } = require('pg');

const app = express();

// Enable JSON body parsing for incoming requests
app.use(express.json());

const port = process.env.PORT || 3001; // Backend server port
const connectionString = process.env.DATABASE_URL;

console.log('DATABASE_URL:', connectionString);

// Try to connect to the database with simple retry logic
async function connectWithRetry(retries = 10, delayMs = 2000) {
  let attempt = 0;

  while (attempt < retries) {
    attempt += 1;
    console.log(`Attempting to connect to the database (${attempt}/${retries})...`);

    const client = new Client({ connectionString });

    try {
      await client.connect();
      console.log('Successfully connected to the database!');

      const res = await client.query('SELECT current_database()');
      console.log('Connected to database:', res.rows[0].current_database);

      return client;
    } catch (error) {
      console.error('Database connection error:', error.message);

      if (attempt === retries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

let dbClient;

// Initialize database connection and start server
(async () => {
  try {
    dbClient = await connectWithRetry();

    app.listen(port, () => {
      console.log(`Backend running on port ${port}`);
    });
  } catch (error) {
    console.error(
      'Failed to connect to the database. Server will not be started.'
    );
    process.exit(1);
  }
})();

// Routes

// Health route
app.get('/', (req, res) => {
  res.send('Backend API is running! Visit /api to get the time from the database.');
});

// Simple time endpoint (uses PostgreSQL NOW())
app.get('/api', async (req, res) => {
  try {
    const result = await dbClient.query('SELECT NOW() AS time');
    res.json({ time: result.rows[0].time });
  } catch (error) {
    console.error('Error querying time:', error);
    res.status(500).json({ error: 'Failed to get time from database' });
  }
});

// ---- Tasks API ----

// GET /api/tasks - get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await dbClient.query(
      'SELECT id, title, is_done, created_at FROM tasks ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks - create new task
app.post('/api/tasks', async (req, res) => {
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await dbClient.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, is_done, created_at',
      [title.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/tasks/:id/toggle - toggle is_done flag
app.patch('/api/tasks/:id/toggle', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await dbClient.query(
      'UPDATE tasks SET is_done = NOT is_done WHERE id = $1 RETURNING id, title, is_done, created_at',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id - delete task
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await dbClient.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});
