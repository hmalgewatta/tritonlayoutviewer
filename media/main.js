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
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const oldState = /** @type {{ count: number} | undefined} */ (vscode.getState());

    console.log('Initial state', oldState);
    // @ts-ignore
    let grid = /** @type {HTMLElement} */ (document.getElementById('waveGrid'));

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        console.log("message", message);
        switch (message.command) {
            case 'initialize':
              // Update config with received data
              // Initialize the grid with new configuration
              console.log("Message received", message.data);
              initializeGrid(document, message.data);
              break;
        }
    });

    // @ts-ignore
    function createWaveCell(level, document, tritonConfig) {
      const cell = document.createElement('div');
      cell.className = 'wave-cell';
      
      // @ts-ignore
      const size = tritonConfig.triton_gpu.blocked.size;
      const order = tritonConfig.triton_gpu.blocked.order;
      const threadsPerWarp = tritonConfig.triton_gpu.blocked.threadsPerWarp;
      const warpsPerCTA = tritonConfig.triton_gpu.blocked.warpsPerCTA;
      // @ts-ignore
      const shapePerCTA = tritonConfig.triton_gpu.blocked.shapePerCTA;
      const threadsWidth = threadsPerWarp[1-order[0]];
      const threadsHeight = threadsPerWarp[1-order[1]];

      // Add wave label
      const label = document.createElement('div');
      label.className = 'wave-label';
      label.textContent = `wave${level}`;
      cell.appendChild(label);
      document.documentElement.style.setProperty('--wave-segments-template-columns-repeat', `${threadsPerWarp[order[0]]}`);
      document.documentElement.style.setProperty('--segment-grid-columns', `1`);
      document.documentElement.style.setProperty('--segment-grid-rows', `${threadsPerWarp[1-order[0]]}`);
      
      // Add segments and blue pattern for wave0
      if (level === 0) {
        const segments = document.createElement('div');
        segments.className = 'wave-segments';
        let cols = shapePerCTA[1]/threadsHeight;
        let rows = shapePerCTA[0]/threadsWidth;
        console.log('cols', cols, 'rows', rows);
        for (let i = 0; i < threadsHeight; i++) {
          const segment = document.createElement('div');
          segment.className = `wave-segment ${i < 1 ? 'filled' : ''}`;
          // segment.className = `wave-segment filled`;
          segments.appendChild(segment);
        }
        
        cell.appendChild(segments);
      }
  
      return cell;
    }
  
    // @ts-ignore
    function createWaveBlock(document, tritonConfig) {
      const block = document.createElement('div');
      block.className = 'wave-block';
      // @ts-ignore
      const size = tritonConfig.triton_gpu.blocked.size;
      const order = tritonConfig.triton_gpu.blocked.order;
      const warpsPerCTA = tritonConfig.triton_gpu.blocked.warpsPerCTA;
      const shapePerCTA = tritonConfig.triton_gpu.blocked.shapePerCTA;
      document.documentElement.style.setProperty('--wave-cell-template-columns-repeat', `${shapePerCTA[1]/warpsPerCTA[1-order[1]]}`);
      
      for (let i = 0; i < warpsPerCTA[1-order[0]]; i++) {
        // for (let j = 0; j < warpsPerCTA[order[1]]; j++) {
        block.appendChild(createWaveCell(i, document, tritonConfig));
        // }
      }
      
      return block;
    }
  
    // @ts-ignore
    function initializeGrid(document, tritonConfig) {
      const grid = document.getElementById('waveGrid');
      const M = document.getElementById('mLabel');
      const K = document.getElementById('kLabel');
      console.log('initializeGrid called', tritonConfig);
      const size = tritonConfig.triton_gpu.blocked.size;
      const sizePerThread = tritonConfig.triton_gpu.blocked.sizePerThread;
      const threadsPerWarp = tritonConfig.triton_gpu.blocked.threadsPerWarp ;
      const warpsPerCTA = tritonConfig.triton_gpu.blocked.warpsPerCTA;
      const order = tritonConfig.triton_gpu.blocked.order;
      const shapePerCTA = [sizePerThread[1-order[0]]*threadsPerWarp[1-order[0]], sizePerThread[1-order[1]]*threadsPerWarp[1-order[1]]];
      tritonConfig.triton_gpu.blocked.shapePerCTA = shapePerCTA;
      const gridColumns = Math.ceil(size[1-order[1]]/(shapePerCTA[1]*warpsPerCTA[1-order[1]]));
      grid.style.setProperty('--size-height', `${size[1-order[0]]}`);
      grid.style.setProperty('--size-width', `${size[1-order[1]]}`);
      document.documentElement.style.setProperty('--wave-grid-template-columns-repeat', gridColumns);
      console.log('initializeGrid called', grid);
      M.textContent = `M = ${size[1-order[0]]}`;
      K.textContent = `K = ${size[1-order[1]]}`;
      console.log('rows of grid', Math.ceil(size[1-order[0]]/(shapePerCTA[0]*warpsPerCTA[1-order[0]])));
      console.log(size[1-order[0]], shapePerCTA[0], warpsPerCTA[1-order[0]]);
      for (let i = 0; i < Math.ceil(size[1-order[0]]/(shapePerCTA[0]*warpsPerCTA[1-order[0]])) && grid; i++) {
        for (let j = 0; j < gridColumns; j++) {
          grid.appendChild(createWaveBlock(document, tritonConfig));
        }
      }
      vscode.setState({ tritonConfig });
    }
}());