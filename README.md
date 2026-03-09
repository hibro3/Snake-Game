# Snake-Game

A modern Snake Game built using HTML5 Canvas and JavaScript.
The game runs directly in the browser and features smooth gameplay, animated snake design, and responsive canvas rendering.

🎮 Demo
You can play the game by opening index.html in your browser.
(You can also host it later using GitHub Pages.)

✨ Features
✔ Smooth snake movement
✔ Touch / swipe controls
✔ Custom snake design
✔ Food generation system
✔ Score tracking
✔ Game over detection
✔ Canvas-based rendering
✔ Responsive game canvas

🛠️ Technologies Used
HTML5 – Structure of the game
CSS3 – Styling and layout
JavaScript (ES6) – Game logic
Canvas API – Rendering graphics

📂 Project Structure
Snake-Game
│
├── index.html        # Main HTML file
├── style.css         # Game styling
├── script.js         # Game logic
└── assets            # Images / sprites

🚀 How to Run the Game
1️⃣ Clone the repository
git clone https://hibro3.github.io/Snake-Game/
2️⃣ Open the folder
snake-game
3️⃣ Run the game

Open:
index.html
in your browser.

🎯 Controls
The game uses touch/swipe controls for movement.
Gesture	Action
👆 Swipe Up	Move Up
👇 Swipe Down	Move Down
👈 Swipe Left	Move Left
👉 Swipe Right	Move Right
Simply swipe on the screen in the direction you want the snake to move.

🧠 Game Logic

The Snake Game is built using JavaScript and HTML5 Canvas. The game works by updating the snake's position on a grid and redrawing the canvas repeatedly to create movement.

Grid System
The canvas is divided into small square tiles that form the game grid.
The snake and food positions are aligned to this grid so the snake moves one tile at a time.

Snake Movement
The snake is stored as an array of segments.
Each segment has an x and y coordinate.

When the snake moves:
A new head is added in the direction of movement.
The last segment of the snake is removed.
This creates the illusion of movement.

Touch Controls
The game uses swipe gestures to control the snake.
Swiping up, down, left, or right changes the direction of the snake.

Food System
Food appears at a random position on the grid.
When the snake reaches the food:
The snake grows longer
The score increases
A new food item is generated

Collision Detection
The game ends when:
The snake hits the wall
The snake collides with its own body

Game Loop
The game continuously runs a loop that:
Updates the snake position
Checks collisions
Detects food consumption
Clears the canvas
Draws the snake and food again
This loop creates smooth gameplay and animation.

✅ This version is ideal for GitHub because it is:
Short
Easy to read
Professional looking.

🔮 Future Improvements
🔊 Sound effects
📱 Mobile swipe controls
🏆 High score system
🎨 Multiple snake skins
⚡ Power-ups
🎮 Difficulty levels

👨‍💻 Author
Viraj Jambhulkar
If you like this project, consider giving it a ⭐ on GitHub!
