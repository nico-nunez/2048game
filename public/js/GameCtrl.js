const GameCtrl = (function () {
	let currentBoard;
  let previousBoardUI;
  let tempBoard; // used for animations
  let tilesMoved;
  let winningTile
	let previouScore = 0; // total game score prior to move
	let turnScore = 0; // points accrued from recent move
	let currentScore = 0; // total current game score
	let bestScore = localStorage.getItem('best-score') || 0;
  const boxSpacing = Math.floor(document.querySelector('[data-grid=x1-y0]').getBoundingClientRect().left - document.querySelector('[data-grid=x0-y0]').getBoundingClientRect().left);

	//============ UI ==================
	function newGame() {
		currentBoard = [
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		];
		previouScore = 0;
		currentScore = 0;
    winningTile = 2048;
		updateScoreBoard();
		clearGameBoard();
		generateRandomTile();
    previousBoardUI = getBoardUIState();
	}

	// ------------ New Box ---------------
	function generateRandomTile() {
		const value = getValue(); // returns random value of 2 or 4
		const boxGridPos = selectRandomBox(); // returns `x${xPos}-y${yPos}`
		if (boxGridPos) {
			occupyBox(boxGridPos, value, true); // Update UI to display new tile
			currentBoard[boxGridPos[4]][boxGridPos[1]] = value;
		} else {
			// All boxes are filled and no valid tile combinations left
			gameOver(); // -- currently never runs ---
		}
	}

	// Sets random value for new tile (2 or 4)
	function getValue() {
		const nums = [2, 4];
		return nums[Math.round(Math.random() * 1)];
	}

	// Returns grid postion ('x0-y1') of a random unoccupied box or null
	function selectRandomBox() {
		const unoccupiedBoxes = document.querySelectorAll(
			'[data-occupied="false"]'
		);
		const numBoxes = unoccupiedBoxes.length;
		if (!numBoxes) return null;
		return unoccupiedBoxes[Math.floor(Math.random() * numBoxes)].getAttribute(
			"data-grid"
		);
	}

	// ----------- Game Board UI -----------------------------
	function occupyBox(gridPos, tileValue, popIn=false) {
		const rowBox = document.querySelector(`[data-grid = ${gridPos}]`);
    resetBox(rowBox);
		updateValueBox(rowBox.children[0], tileValue, popIn);
		rowBox.setAttribute("data-occupied", "true");
	}

	function updateValueBox(valueBoxElement, value, popIn) { 
		if (value > 999) {
			valueBoxElement.classList.add("value-four-digit");
		} else if (value > 99) {
			valueBoxElement.classList.add("value-three-digit");
		}
		valueBoxElement.textContent = value;
		valueBoxElement.classList.add("occupied", `bg-${value}`);
    if(popIn) valueBoxElement.classList.add('pop-in');
	}

  // Triggers animations for moved tiles, then generates new tile.
	function updateGameBoard() {
    removePopInClass();
    for(const tile of tilesMoved) {
      slideTile(tile);
      if(currentBoard[tile.endPos[4]][tile.endPos[1]] === winningTile) {
        displayWinningMessage();
      }
    }
	}

  function removePopInClass() {
    const popInBoxes = document.querySelectorAll('.pop-in');
    for(const box of popInBoxes) {
      box.classList.remove('pop-in');
    }
  }

	// Clears and resets all UI tiles
	function clearGameBoard() {
		const occupiedBoxes = document.querySelectorAll("[data-occupied = 'true']");
		for (const box of occupiedBoxes) {
      resetBox(box)
		}
	}

  // Resets box element to unoccupied
  function resetBox(boxElement) {
    boxElement.setAttribute('data-occupied', 'false');
    boxElement.children[0].classList = 'value-box';
    boxElement.children[0].textContent = '';
  }

  function slideTile(tile) {
    const rowBox = document.querySelector(`[data-grid = ${tile.startPos}]`);
    const slidingBox = copyTile(rowBox); // copy tile to be animated
    resetBox(rowBox); // Reset row-box and original child element
    const slidingAnimation = slideAnimation(tile.direction, tile.offset);
    const duration = Math.abs(tile.offset) * .5;
    const tileAnimation = slidingBox.animate(slidingAnimation, duration < 110 ? 110 : duration);
    tileAnimation.onfinish = handleAnimationEnd;

    function handleAnimationEnd() {
      const gridPos = tile.endPos;
      const value = currentBoard[gridPos[4]][gridPos[1]];
      const addPopIn = value > tile.startValue;
      occupyBox(gridPos, value, addPopIn);
      slidingBox.remove();
    }
  }

  // Clone row-box's child valueBox and append to row-box
  function copyTile(boxElem) {
    const copy = boxElem.children[0].cloneNode(true);
    boxElem.appendChild(copy);
    return copy;
  }

  function slideAnimation(direction, offset) {
    if (direction === 'left' || direction === 'right') {
      return [
        {transform: `translateX(0)`},
        {transform: `translateX(${offset.toString()}px)`}
      ]
    } else {
      return [
        {transform: `translateY(0)`},
        {transform: `translateY(${offset.toString()}px)`}
      ]
    }
  }

  function movementDetails(direction, colIndex, rowIndex, occupiedIndex) {
		let startPos;
    let startValue;
		let offset; // number of pixels translated for animation
		if (direction === "left" || direction === "right") {
			startPos = `x${occupiedIndex}-y${rowIndex}`;
			startValue = tempBoard[`x${occupiedIndex}-y${rowIndex}`].value;
      offset = (colIndex - occupiedIndex) * boxSpacing; // right +(pos) / left -(neg)
		} else {
			startPos = `x${colIndex}-y${occupiedIndex}`;
			startValue = tempBoard[`x${colIndex}-y${occupiedIndex}`].value;
      offset = (rowIndex - occupiedIndex) * boxSpacing;// down +(pos) / up -(neg)
		}
		return {
			startPos,
      startValue,
      direction,
      offset: offset,
			endPos: `x${colIndex}-y${rowIndex}`
		};
	}

  // -------------- Super Secret Dark Mode :) ------------------
  const bestScoreBox = document.querySelector('.scoreboard-scores').children[1];
  let counter = 0
  bestScoreBox.addEventListener('click', ()=> {
    counter++
    if(counter >= 5) {
      document.querySelector('body').classList.toggle('dark-mode-bg');
      document.querySelector('.instructions').classList.toggle('dark-mode-text');
      counter = 0;
    }
  })

	// --------------- Game State ----------------
	// Get grid positions and values of all row-box elements
	function getBoardUIState() {
		const boardState = {};
		const allRowBoxes = document.querySelectorAll(".row-box");
		for (const rowBox of allRowBoxes) {
			const gridPos = rowBox.getAttribute("data-grid");
			const value = Number(rowBox.children[0].textContent);
			boardState[gridPos] = {
				value,
				isOccupied: function () {
					return this.value > 0;
				},
			};
		}
		return boardState;
	}

	// Update scoreboard UI
	function updateScoreBoard(undo = false) {
		if (undo === "undo" || undo === true) {
			currentScore = previouScore;
		} else {
			previouScore = currentScore;
			currentScore = previouScore + turnScore;
		}
		turnScore = 0;
		document.querySelector("#current-score").textContent = currentScore;
		if (currentScore > bestScore) {
			bestScore = currentScore;
      localStorage.setItem('best-score', bestScore);
		}
    document.querySelector("#best-score").textContent = bestScore;
	}

	function displayWinningMessage() {
    const endGameContent = document.querySelector('.end-game-message');
    endGameContent.classList.remove('hidden');
    document.querySelector('#winning-tile').textContent = winningTile;
    document.querySelector('#next-winning-tile').textContent = winningTile * 2;
    endGameContent.addEventListener('click', handleWinningTile);
    document.querySelector('.winning-message').classList.remove('hidden');


    function handleWinningTile(evt) {
      if (evt.target.id === 'continue') {
        winningTile *= 2;
        endGameContent.removeEventListener('click', handleWinningTile)
        endGameContent.classList.add('hidden');
      } else if(evt.target.id === 'new-game') {
        newGame();
        endGameContent.removeEventListener('click', handleWinningTile)
        endGameContent.classList.add('hidden');
      }
    }
	}

	// Undo previous move only
	function undoMove() {
		clearGameBoard();
		for (const gridPos in previousBoardUI) {
			if (previousBoardUI[gridPos].value > 0) {
				occupyBox(gridPos, previousBoardUI[gridPos].value);
			}
		}
		const currentBoardUI = getBoardUIState();
		for (const gridPos in currentBoardUI) {
			currentBoard[gridPos[4]][gridPos[1]] = currentBoardUI[gridPos].value;
		}
		updateScoreBoard("undo");
	}

	// ========== Movement =====================
	function moveTiles(direction) {
    tempBoard = getBoardUIState();
    tilesMoved = []
		if (direction === "up" || direction === "down") {
			moveTilesVertically(direction);
		} else {
			moveTilesHorizontally(direction);
		}
		if (!tilesMoved.length) return; // do nothing no tiles changed positions
		previousBoardUI = getBoardUIState(); // Board state prior to move for undo
    updateGameBoard();
		updateScoreBoard();
    setTimeout(generateRandomTile, 320);
	}

	// Horizontal Move
	function moveTilesHorizontally(direction) {
		const lenBoard = currentBoard.length;
		const col = direction === "right" ? 3 : 0;
		for (let row = 0; row < lenBoard; row++) {
			sortRow(direction, col, row);
		}
	}

	// Sorts and combines specific matching tiles in a row
	function sortRow(direction, colIndex = 0, rowIndex = 0) {
		const occupiedIndex = findFirstOccupiedBox(direction, colIndex, rowIndex); // returns -1 if none
		if (occupiedIndex < 0) return; // End -- row sorted
		// Case: current box is unoccupied
		if (currentBoard[rowIndex][colIndex] === 0) {
			// Set value of current box to value of first occupied box
			currentBoard[rowIndex][colIndex] = currentBoard[rowIndex][occupiedIndex];
			// Set previously occupied box to unoccupied
			currentBoard[rowIndex][occupiedIndex] = 0;
			// Track moved tile and movement details for animation
      tilesMoved.push(movementDetails(direction, colIndex, rowIndex, occupiedIndex))
			// Rerun at current position and check if next tile's value matches
			return sortRow(direction, colIndex, rowIndex);
		}
		// Case: current box is occupied and next occupied box's value matches
		if (currentBoard[rowIndex][colIndex] === currentBoard[rowIndex][occupiedIndex]) {
			// Combine tiles and values at current box position
			currentBoard[rowIndex][colIndex] *= 2;
			// Set previously occupied box to unoccupied
			currentBoard[rowIndex][occupiedIndex] = 0;
			// Add points to turn score
			turnScore += currentBoard[rowIndex][colIndex];
			// Track moved tiles and movement details for animation
      tilesMoved.push(movementDetails(direction, colIndex, rowIndex, occupiedIndex));
		}
		// Case: current box is occupied and next tiles's value is non-matching (move on to next col)
		if (direction === "right") return sortRow(direction, colIndex - 1, rowIndex);
		return sortRow(direction, colIndex + 1, rowIndex); // direction === 'left'
  }
	// Vertical Movement
	function moveTilesVertically(direction) {
		const numColumns = currentBoard.length;
		const row = direction === "down" ? 3 : 0;
		for (let col = 0; col < numColumns; col++) {
			sortColumn(direction, col, row);
		}
	}

	function sortColumn(direction, colIndex = 0, rowIndex = 0) {
		const occupiedIndex = findFirstOccupiedBox(direction, colIndex, rowIndex); // returns -1 if none
		if (occupiedIndex < 0) return; // End -- column sorted

		// Case: current box is unoccupied
		if (currentBoard[rowIndex][colIndex] === 0) {
			// Set value of current box to value of first occupied box
			currentBoard[rowIndex][colIndex] = currentBoard[occupiedIndex][colIndex];
			// Set previously occupied box to 0 (unoccupied)
			currentBoard[occupiedIndex][colIndex] = 0;
			// Track moved tiles and movement details for animation
      tilesMoved.push(movementDetails(direction, colIndex, rowIndex, occupiedIndex));
			// Rerun at current position and check if next occupied box has matching value
			return sortColumn(direction, colIndex, rowIndex);
		}
		// Case: current box is occupied and next box's value is the same
		if (currentBoard[rowIndex][colIndex] === currentBoard[occupiedIndex][colIndex]) {
			// Double current box's value
			currentBoard[rowIndex][colIndex] *= 2;
			// Set next occupied box index to unoccupied
			currentBoard[occupiedIndex][colIndex] = 0;
			// Add points to turn score
			turnScore += currentBoard[rowIndex][colIndex];
			// Track moved tiles and movement details for animation
      tilesMoved.push(movementDetails(direction, colIndex, rowIndex, occupiedIndex));
		}
		// Case: current box is occupied and next box's value is non-matching
		if (direction === "down")
			return sortColumn(direction, colIndex, rowIndex - 1);
		return sortColumn(direction, colIndex, rowIndex + 1); // move on to next row in col
	}

	// ============ Utilities ==============

	// Returns first occupied box's index based on direction or -1 if none
	function findFirstOccupiedBox(direction, colIndex, rowIndex) {
		const lenBoard = currentBoard.length;
		if (direction === "left") {
			for (let x = colIndex + 1; x < lenBoard; x++) {
				if (currentBoard[rowIndex][x] > 0) return x;
			}
		} else if (direction === "right") {
			for (let x = colIndex - 1; x > -1; x--) {
				if (currentBoard[rowIndex][x] > 0) return x;
			}
		} else if (direction === "up") {
			for (let y = rowIndex + 1; y < lenBoard; y++) {
				if (currentBoard[y][colIndex] > 0) return y;
			}
		} else if (direction === "down") {
			for (let y = rowIndex - 1; y > -1; y--) {
				if (currentBoard[y][colIndex] > 0) return y;
			}
		}
		return -1; // returns if no boxes with a value were found
	}

  return {newGame, moveTiles, undoMove};
})();
