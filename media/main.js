// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

// Previous JavaScript remains exactly the same
function createWaveCell(level, document) {
    const cell = document.createElement('div');
    cell.className = 'wave-cell';

    // Add wave label
    const label = document.createElement('div');
    label.className = 'wave-label';
    label.textContent = `wave${level}`;
    cell.appendChild(label);

    // Add segments and blue pattern for wave0
    if (level === 0) {
      const segments = document.createElement('div');
      segments.className = 'wave-segments';
      
      for (let i = 0; i < 8; i++) {
        const segment = document.createElement('div');
        segment.className = `wave-segment ${i < 2 ? 'filled' : ''}`;
        segments.appendChild(segment);
      }
      
      cell.appendChild(segments);

      // Add red indicator
      const indicator = document.createElement('div');
      indicator.className = 'red-indicator';
      cell.appendChild(indicator);
    }

    return cell;
  }

  function createWaveBlock(document) {
    const block = document.createElement('div');
    block.className = 'wave-block';
    
    for (let i = 0; i < 4; i++) {
      block.appendChild(createWaveCell(i, document));
    }
    
    return block;
  }

  function initializeGrid(document) {
    const grid = document.getElementById('waveGrid');
    console.log(grid);
    // Create 4 rows of 2 blocks each
    for (let i = 0; i < 4 && grid; i++) {
      // Left block
      grid.appendChild(createWaveBlock(document));
      // Right block
      grid.appendChild(createWaveBlock(document));
    }
  }

  // Initialize the visualization
//   document.addEventListener('DOMContentLoaded', initializeGrid);

(function () {
    const vscode = acquireVsCodeApi();

    const oldState = /** @type {{ count: number} | undefined} */ (vscode.getState());

    const counter = /** @type {HTMLElement} */ (document.getElementById('lines-of-code-counter'));
    console.log('Initial state', oldState);
    let grid = /** @type {HTMLElement} */ (document.getElementById('waveGrid'));
    let currentCount = (oldState && oldState.count) || 0;
    counter.textContent = `${currentCount}`;

    // setInterval(() => {
    //     counter.textContent = `${currentCount++} `;

    //     // Update state
    //     vscode.setState({ count: currentCount });

    //     // Alert the extension when the cat introduces a bug
    //     if (Math.random() < Math.min(0.001 * currentCount, 0.05)) {
    //         // Send a message back to the extension
    //         vscode.postMessage({
    //             command: 'alert',
    //             text: '🐛  on line ' + currentCount
    //         });
    //     }
    // }, 100);
    initializeGrid(document);
  // window.addEventListener('DOMContentLoaded', initializeGrid);

    // createWaveCell(8);

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.command) {
            case 'refactor':
                currentCount = Math.ceil(currentCount * 0.5);
                counter.textContent = `${currentCount}`;
                break;
        }
    });
}());