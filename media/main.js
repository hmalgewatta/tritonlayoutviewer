// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

// Previous JavaScript remains exactly the same


  // Initialize the visualization
//   document.addEventListener('DOMContentLoaded', initializeGrid);
// document.addEventListener('message', event => {
//   const message = event.data; // The json data that the extension sent
//   console.log("message", message);
//   switch (message.command) {
//       case 'refactor':
//           currentCount = Math.ceil(currentCount * 0.5);
//           counter.textContent = `${currentCount}`;
//           break;
//       case 'initialize':
//         // Update config with received data
//         // Initialize the grid with new configuration
//         console.log("Message received", message.data);
//         initializeGrid(document, message.data);
//         break;
//   }
// });

(function () {
    const vscode = acquireVsCodeApi();

    const oldState = /** @type {{ count: number} | undefined} */ (vscode.getState());

    console.log('Initial state', oldState);
    let grid = /** @type {HTMLElement} */ (document.getElementById('waveGrid'));

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
    // initializeGrid(document);
  // window.addEventListener('DOMContentLoaded', initializeGrid);

    // createWaveCell(8);

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        console.log("message", message);
        switch (message.command) {
            // case 'refactor':
            //     currentCount = Math.ceil(currentCount * 0.5);
            //     counter.textContent = `${currentCount}`;
            //     break;
            case 'initialize':
              // Update config with received data
              // Initialize the grid with new configuration
              console.log("Message received", message.data);
              initializeGrid(document, message.data);
              break;
        }
    });

    function createWaveCell(level, document, warpsOnY) {
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
        
        for (let i = 0; i < warpsOnY; i++) {
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
  
    function createWaveBlock(document, tritonConfig) {
      const block = document.createElement('div');
      block.className = 'wave-block';
      const size = tritonConfig.triton_gpu.blocked.size;
      const order = tritonConfig.triton_gpu.blocked.order;
      const warpsPerCTA = tritonConfig.triton_gpu.blocked.warpsPerCTA;
      const shapePerCTA = tritonConfig.triton_gpu.blocked.shapePerCTA;
      
      for (let i = 0; i < warpsPerCTA[order[0]]; i++) {
        block.appendChild(createWaveCell(i, document, warpsPerCTA[order[1]]));
      }
      
      return block;
    }
  
    function initializeGrid(document, tritonConfig) {
      const grid = document.getElementById('waveGrid');
      console.log('initializeGrid called', tritonConfig);
      const size = tritonConfig.triton_gpu.blocked.size;
      const sizePerThread = tritonConfig.triton_gpu.blocked.sizePerThread;
      const threadsPerWarp = tritonConfig.triton_gpu.blocked.threadsPerWarp ;
      const warpsPerCTA = tritonConfig.triton_gpu.blocked.warpsPerCTA;
      const order = tritonConfig.triton_gpu.blocked.order;
      const shapePerCTA = [sizePerThread[order[0]]*threadsPerWarp[order[0]], sizePerThread[order[1]]*threadsPerWarp[order[1]]];
      tritonConfig.triton_gpu.blocked.shapePerCTA = shapePerCTA;
  
      console.log('initializeGrid called', grid);
      // Create 4 rows of 2 blocks each
      for (let i = 0; i < Math.ceil(size[order[0]]/(shapePerCTA[0]*warpsPerCTA[order[0]])) && grid; i++) {
        // Left block
        for (let j = 0; j < Math.ceil(size[order[1]]/(shapePerCTA[1]*warpsPerCTA[order[1]])); j++) {
        grid.appendChild(createWaveBlock(document, tritonConfig));
        }
        // Right block
        // grid.appendChild(createWaveBlock(document, tritonConfig));
      }
      vscode.setState({ tritonConfig });
    }
}());