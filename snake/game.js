class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.startButton = document.getElementById('startButton');
        this.scoreElement = document.getElementById('score');
        this.nameModal = document.getElementById('nameModal');
        this.playerNameInput = document.getElementById('playerName');
        this.saveScoreButton = document.getElementById('saveScore');
        
        // Configuración del canvas
        this.canvas.width = 400;
        this.canvas.height = 400;
        this.gridSize = 20;

        // Inicializar variables del juego
        this.snake = [];
        this.food = null;
        this.obstacles = [];  // Inicializar el array de obstáculos
        this.obstacleTimer = 0;
        this.obstacleInterval = 30;
        this.maxObstacles = 15;
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.gameOver = false;
        this.gameStarted = false;
        
        // Eventos
        this.startButton.addEventListener('click', () => this.startGame());
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        this.saveScoreButton?.addEventListener('click', () => this.saveScore());

        // Inicializar Supabase
        if (typeof supabase !== 'undefined') {
            const SUPABASE_URL = 'https://ywbhvzsrelrxdhdutteb.supabase.co';
            const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3Ymh2enNyZWxyeGRoZHV0dGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MTc1NzEsImV4cCI6MjA1NDE5MzU3MX0.1yMTk9Q5Dih5ld46NYzg9Vj3_PYXxNDCG1qkBKR8COU';
            this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            this.loadRankings();
        }

        // Inicializar el juego
        this.reset();
    }

    reset() {
        this.snake = [{x: 5, y: 5}];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.obstacles = [];  // Reiniciar obstáculos
        this.obstacleTimer = 0;
        this.score = 0;
        this.gameOver = false;
        this.scoreElement.textContent = this.score;
        this.food = this.generateFood();  // Generar comida después de inicializar obstáculos
    }

    generateFood() {
        let food;
        do {
            food = {
                x: Math.floor(Math.random() * (this.canvas.width / this.gridSize)),
                y: Math.floor(Math.random() * (this.canvas.height / this.gridSize))
            };
        } while (
            this.snake.some(segment => segment.x === food.x && segment.y === food.y) ||
            (this.obstacles && this.obstacles.some(obs => obs.x === food.x && obs.y === food.y))
        );
        return food;
    }

    generateObstacle() {
        if (!this.obstacles || this.obstacles.length >= this.maxObstacles) return;
        
        let obstacle;
        let attempts = 0;
        const maxAttempts = 50;

        do {
            obstacle = {
                x: Math.floor(Math.random() * (this.canvas.width / this.gridSize)),
                y: Math.floor(Math.random() * (this.canvas.height / this.gridSize))
            };
            attempts++;

            if (attempts >= maxAttempts) return;

            // Evitar generar obstáculos cerca de la serpiente
            const head = this.snake[0];
            const tooClose = Math.abs(head.x - obstacle.x) <= 2 && Math.abs(head.y - obstacle.y) <= 2;
            if (tooClose) continue;

        } while (
            this.snake.some(segment => segment.x === obstacle.x && segment.y === obstacle.y) ||
            (this.food.x === obstacle.x && this.food.y === obstacle.y) ||
            this.obstacles.some(obs => obs.x === obstacle.x && obs.y === obstacle.y)
        );

        if (obstacle) {
            this.obstacles.push(obstacle);
        }
    }

    draw() {
        // Limpiar canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Dibujar obstáculos
        this.ctx.fillStyle = '#666666';
        this.obstacles.forEach(obstacle => {
            this.ctx.fillRect(
                obstacle.x * this.gridSize,
                obstacle.y * this.gridSize,
                this.gridSize - 1,
                this.gridSize - 1
            );
        });

        // Dibujar serpiente
        this.ctx.fillStyle = 'lime';
        this.snake.forEach(segment => {
            this.ctx.fillRect(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                this.gridSize - 1,
                this.gridSize - 1
            );
        });

        // Dibujar comida
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(
            this.food.x * this.gridSize,
            this.food.y * this.gridSize,
            this.gridSize - 1,
            this.gridSize - 1
        );
    }

    async loadRankings() {
        if (!this.supabase) return;

        try {
            const { data, error } = await this.supabase
                .from('scores')
                .select('*')
                .order('score', { ascending: false })
                .limit(10);

            if (error) throw error;

            const rankingBody = document.getElementById('rankingBody');
            if (rankingBody) {
                rankingBody.innerHTML = '';
                data.forEach((score, index) => {
                    const row = document.createElement('tr');
                    const date = new Date(score.created_at).toLocaleDateString();
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${score.player_name}</td>
                        <td>${score.score}</td>
                        <td>${date}</td>
                    `;
                    rankingBody.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Error al cargar rankings:', error);
        }
    }

    async saveScore() {
        if (!this.supabase) return;

        const playerName = this.playerNameInput.value.trim();
        if (!playerName) {
            alert('Por favor, introduce tu nombre');
            return;
        }

        try {
            const { error } = await this.supabase
                .from('scores')
                .insert([
                    { player_name: playerName, score: this.score }
                ]);

            if (error) throw error;

            if (this.nameModal) {
                this.nameModal.style.display = 'none';
            }
            this.loadRankings();
        } catch (error) {
            console.error('Error al guardar puntuación:', error);
            alert('Error al guardar la puntuación. Inténtalo de nuevo.');
        }
    }

    move() {
        if (this.gameOver || !this.gameStarted) return;

        // Gestionar obstáculos
        this.obstacleTimer++;
        if (this.obstacleTimer >= this.obstacleInterval) {
            this.generateObstacle();
            this.obstacleTimer = 0;
            // Reducir el intervalo conforme aumenta la puntuación
            this.obstacleInterval = Math.max(15, 30 - Math.floor(this.score / 50));
        }

        // Actualizar dirección
        this.direction = this.nextDirection;

        // Calcular nueva posición de la cabeza
        const head = {...this.snake[0]};
        switch (this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // Verificar colisiones
        if (this.checkCollision(head)) {
            this.gameOver = true;
            this.startButton.textContent = 'Reiniciar';
            this.startButton.style.display = 'block';
            if (this.nameModal) {
                this.nameModal.style.display = 'flex';
            }
            return;
        }

        // Añadir nueva cabeza
        this.snake.unshift(head);

        // Verificar si come
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.scoreElement.textContent = this.score;
            this.food = this.generateFood();
        } else {
            this.snake.pop();
        }
    }

    checkCollision(head) {
        // Colisión con paredes
        if (head.x < 0 || head.x >= this.canvas.width / this.gridSize ||
            head.y < 0 || head.y >= this.canvas.height / this.gridSize) {
            return true;
        }

        // Colisión con la serpiente
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            return true;
        }

        // Colisión con obstáculos
        return this.obstacles && this.obstacles.some(obstacle => obstacle.x === head.x && obstacle.y === head.y);
    }

    handleKeyPress(event) {
        if (!this.gameStarted) return;

        // Evitar el scroll con las teclas de flecha
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
        }

        switch (event.key) {
            case 'ArrowUp':
                if (this.direction !== 'down') this.nextDirection = 'up';
                break;
            case 'ArrowDown':
                if (this.direction !== 'up') this.nextDirection = 'down';
                break;
            case 'ArrowLeft':
                if (this.direction !== 'right') this.nextDirection = 'left';
                break;
            case 'ArrowRight':
                if (this.direction !== 'left') this.nextDirection = 'right';
                break;
        }
    }

    gameLoop() {
        this.move();
        this.draw();

        if (!this.gameOver && this.gameStarted) {
            setTimeout(() => requestAnimationFrame(() => this.gameLoop()), 100);
        }
    }

    startGame() {
        this.reset();
        this.gameStarted = true;
        this.startButton.style.display = 'none';
        this.gameLoop();
    }
}

// Iniciar juego cuando cargue la página
window.onload = () => {
    new SnakeGame();
};
