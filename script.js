// 1. Gameboard Module (IIFE - Single Instance)
const Gameboard = (function() {
    const board = ["", "", "", "", "", "", "", "", ""];
    const getBoard = () => board;

    const placeMarker = (index, marker) => {
        if (board[index] === "") {
            board[index] = marker;
            return true;
        }
        return false;
    };

    const resetBoard = () => {
        for (let i = 0; i < board.length; i++) board[i] = "";
    };

    return { getBoard, placeMarker, resetBoard };
})();

// 2. Player Factory Function (Multiple Instances)
const createPlayer = function(name, marker, isAi = false) {
    return { name, marker, isAi };
};

// 3. Game Flow Controller Module (IIFE)
const GameController = (function() {
    let players = [
        createPlayer("Player 1", "X", false),
        createPlayer("Player 2", "O", false)
    ];
    
    let activePlayer = players[0];
    let isGameOver = false;
    let isAiThinking = false; 
    let difficulty = "pvp"; // Options: pvp, easy, medium, hard

    const setGameMode = (mode) => {
        difficulty = mode;
        if (mode === "pvp") {
            players[1] = createPlayer("Player 2", "O", false);
        } else {
            players[1] = createPlayer("Matrix AI", "O", true);
        }
        restartGame();
    };

    const switchPlayerTurn = () => {
        activePlayer = activePlayer === players[0] ? players[1] : players[0];
    };

    const getActivePlayer = () => activePlayer;
    const getIsGameOver = () => isGameOver;
    const getIsAiThinking = () => isAiThinking;

    const checkWinCondition = (boardState, marker) => {
        const winConditions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        return winConditions.some(combo => combo.every(idx => boardState[idx] === marker));
    };

    const checkWin = () => checkWinCondition(Gameboard.getBoard(), activePlayer.marker);
    const checkTie = () => Gameboard.getBoard().every(cell => cell !== "");

    // --- AI BOT INTELLIGENCE ENGINE ---
    const getAvailableMoves = (boardState) => {
        return boardState.map((cell, idx) => cell === "" ? idx : null).filter(val => val !== null);
    };

    const minimax = (boardState, depth, isMax) => {
        if (checkWinCondition(boardState, "O")) return 10 - depth;
        if (checkWinCondition(boardState, "X")) return depth - 10;
        if (!boardState.includes("")) return 0;

        if (isMax) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (boardState[i] === "") {
                    boardState[i] = "O";
                    let score = minimax(boardState, depth + 1, false);
                    boardState[i] = "";
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (boardState[i] === "") {
                    boardState[i] = "X";
                    let score = minimax(boardState, depth + 1, true);
                    boardState[i] = "";
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    };

    const calculateAiMove = () => {
        const boardState = [...Gameboard.getBoard()];
        const available = getAvailableMoves(boardState);

        // Tier A: Novice Strategy (Pure random selection)
        if (difficulty === "easy") {
            return available[Math.floor(Math.random() * available.length)];
        }

        // Tier B: Tactical Strategy (Smart focus with a 30% blunder rate)
        if (difficulty === "medium") {
            // Introduce a 30% chance to intentionally make a random slip-up
            if (Math.random() < 0.3) {
                console.log("🤖 AI experienced a processing glitch (Blunder)!");
                return available[Math.floor(Math.random() * available.length)];
            }

            // 1. Check if AI can win instantly
            for (let move of available) {
                boardState[move] = "O";
                if (checkWinCondition(boardState, "O")) return move;
                boardState[move] = "";
            }
            // 2. Check if Human needs to be blocked instantly
            for (let move of available) {
                boardState[move] = "X";
                if (checkWinCondition(boardState, "X")) return move;
                boardState[move] = "";
            }
            // 3. Take the center spot if open
            if (available.includes(4)) return 4;
            
            // 4. Default fallback to random selection
            return available[Math.floor(Math.random() * available.length)];
        }

        // Tier C: Minimax Engine (Perfect mathematical calculations)
        let bestScore = -Infinity;
        let choice = available[0];

        for (let move of available) {
            boardState[move] = "O";
            let score = minimax(boardState, 0, false);
            boardState[move] = "";
            if (score > bestScore) {
                bestScore = score;
                choice = move;
            }
        }
        return choice;
    };

    const executeAiTurn = () => {
        if (isGameOver) return;
        isAiThinking = true;

        setTimeout(() => {
            const bestMove = calculateAiMove();
            Gameboard.placeMarker(bestMove, activePlayer.marker);

            if (checkWin()) {
                isGameOver = true;
                DisplayController.endGameRoutine({ status: "win", winner: activePlayer });
            } else if (checkTie()) {
                isGameOver = true;
                DisplayController.endGameRoutine({ status: "tie" });
            } else {
                switchPlayerTurn();
                isAiThinking = false;
                DisplayController.updateDisplay();
            }
        }, 500); // 500ms artificial thinking delay
    };

    const playRound = (index) => {
        if (isGameOver || isAiThinking) return { status: "blocked" };

        const success = Gameboard.placeMarker(index, activePlayer.marker);
        if (!success) return { status: "invalid" };

        if (checkWin()) {
            isGameOver = true;
            return { status: "win", winner: activePlayer };
        }

        if (checkTie()) {
            isGameOver = true;
            return { status: "tie" };
        }

        switchPlayerTurn();
        
        if (activePlayer.isAi) {
            DisplayController.updateDisplay();
            executeAiTurn();
            return { status: "ai_thinking" };
        }

        return { status: "continue" };
    };

    const restartGame = () => {
        Gameboard.resetBoard();
        activePlayer = players[0];
        isGameOver = false;
        isAiThinking = false;
    };

    return { playRound, getActivePlayer, restartGame, getIsGameOver, getIsAiThinking, setGameMode };
})();

// 4. UI Display Controller Module (IIFE)
const DisplayController = (function() {
    const boardDiv = document.getElementById("gameboard");
    const statusText = document.getElementById("status");
    const restartBtn = document.getElementById("restart-btn");
    const modeSelect = document.getElementById("mode-select");

    const updateDisplay = () => {
        boardDiv.innerHTML = "";
        const board = Gameboard.getBoard();

        board.forEach((cell, index) => {
            const cellBtn = document.createElement("button");
            cellBtn.classList.add("cell");
            cellBtn.dataset.index = index;
            cellBtn.textContent = cell;

            if (cell === "X") cellBtn.classList.add("x-marker");
            if (cell === "O") cellBtn.classList.add("o-marker");

            boardDiv.appendChild(cellBtn);
        });

        if (!GameController.getIsGameOver()) {
            const current = GameController.getActivePlayer();
            if (GameController.getIsAiThinking()) {
                statusText.textContent = "Matrix AI is calculating path...";
            } else {
                statusText.textContent = `${current.name}'s Turn (${current.marker})`;
            }
        }
    };

    const endGameRoutine = (result) => {
        updateDisplay();
        if (result.status === "win") {
            statusText.textContent = `🎉 ${result.winner.name} Dominates the Grid!`;
        } else if (result.status === "tie") {
            statusText.textContent = "🤝 Matrix Stalled! It's a Tie.";
        }
    };

    const handleCellClick = (e) => {
        const index = e.target.dataset.index;
        if (index === undefined) return;

        const result = GameController.playRound(parseInt(index));

        if (result.status === "win" || result.status === "tie") {
            endGameRoutine(result);
        } else if (result.status === "continue" || result.status === "ai_thinking") {
            updateDisplay();
        }
    };

    // Event Listeners
    boardDiv.addEventListener("click", handleCellClick);
    
    restartBtn.addEventListener("click", () => {
        GameController.restartGame();
        updateDisplay();
    });

    modeSelect.addEventListener("change", (e) => {
        GameController.setGameMode(e.target.value);
        updateDisplay();
    });

    // Initial Setup Run
    updateDisplay();

    return { updateDisplay, endGameRoutine };
})();