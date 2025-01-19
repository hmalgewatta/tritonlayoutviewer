(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const oldState = /** @type {{ count: number} | undefined} */ (vscode.getState());

    // @ts-ignore
    let grid = /** @type {HTMLElement} */ (document.getElementById('waveGrid'));

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.command) {
            case 'initialize':
              // Update config with received data
              // Initialize the grid with new configuration
              initializeGrid(document, message.data);
              break;
        }
    });

    // @ts-ignore
    function createWaveCell(level, document, tritonConfig) {
      const cell = document.createElement('div');
      cell.className = 'wave-cell';
      
      // @ts-ignore
      // @ts-ignore
      const size = tritonConfig.triton_gpu.blocked.size;
      const order = tritonConfig.triton_gpu.blocked.order;
      const threadsPerWarp = tritonConfig.triton_gpu.blocked.threadsPerWarp;
      // @ts-ignore
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
        for (let i = 0; i < threadsHeight; i++) {
          const segment = document.createElement('div');
          if (i == 0) {
            segment.className = `wave-segment filled`;
          } else {
            segment.className = `wave-segment`;
          }
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
    function visualizeSizePerThreadSegment(document, tritonConfig) {
      const sizePerThread = tritonConfig.triton_gpu.blocked.sizePerThread;
      const order = tritonConfig.triton_gpu.blocked.order;
      const t0Grid = document.getElementById('t0Grid');
      const sizePerThreadDiv = document.getElementById('sizePerThread');
      sizePerThreadDiv.textContent = `${sizePerThread[1-order[0]]}x${sizePerThread[1-order[1]]}`;
      t0Grid.style.setProperty('--t0-grid-template-columns-repeat', `${sizePerThread[1-order[1]]}`);
      t0Grid.style.setProperty('--t0-grid-template-rows-repeat', `${sizePerThread[1-order[0]]}`);
      for (let i = 0; i < sizePerThread[1-order[1]]*sizePerThread[1-order[0]]; i++) {
        const segment = document.createElement('div');
        if (Math.floor(i/(sizePerThread[1-order[1]])) == sizePerThread[1-order[0]]-1) {
          segment.className = 't0-segment-last-row';
        } else {
          segment.className = 't0-segment';
        }
        t0Grid.appendChild(segment);
      }
    }
  
    // @ts-ignore
    function initializeGrid(document, tritonConfig) {
      const grid = document.getElementById('waveGrid');
      const M = document.getElementById('mLabel');
      const K = document.getElementById('kLabel');

      visualizeSizePerThreadSegment(document, tritonConfig);

      const { size, sizePerThread, threadsPerWarp, warpsPerCTA, order } = tritonConfig.triton_gpu.blocked;
      const shapePerCTA = calculateShapePerCTA(sizePerThread, threadsPerWarp, order);
      tritonConfig.triton_gpu.blocked.shapePerCTA = shapePerCTA;

      const gridColumns = calculateGridColumns(size, shapePerCTA, warpsPerCTA, order);
      setGridProperties(grid, size, shapePerCTA, order, gridColumns);

      updateLabels(M, K, size, order);
      populateGrid(grid, document, tritonConfig, size, shapePerCTA, warpsPerCTA, order, gridColumns);

      vscode.setState({ tritonConfig });
    }

    // @ts-ignore
    function calculateShapePerCTA(sizePerThread, threadsPerWarp, order) {
      return [
        sizePerThread[1 - order[0]] * threadsPerWarp[1 - order[0]],
        sizePerThread[1 - order[1]] * threadsPerWarp[1 - order[1]]
      ];
    }

    // @ts-ignore
    function calculateGridColumns(size, shapePerCTA, warpsPerCTA, order) {
      return Math.ceil(size[1 - order[1]] / (shapePerCTA[1] * warpsPerCTA[1 - order[1]]));
    }

    // @ts-ignore
    function setGridProperties(grid, size, shapePerCTA, order, gridColumns) {
      grid.style.setProperty('--size-height', `${size[1 - order[0]]}`);
      grid.style.setProperty('--size-width', `${size[1 - order[1]]}`);
      document.documentElement.style.setProperty('--wave-grid-template-columns-repeat', gridColumns);
    }

    // @ts-ignore
    function updateLabels(M, K, size, order) {
      M.textContent = `M = ${size[1 - order[0]]}`;
      K.textContent = `K = ${size[1 - order[1]]}`;
    }

    // @ts-ignore
    function populateGrid(grid, document, tritonConfig, size, shapePerCTA, warpsPerCTA, order, gridColumns) {
      const rows = Math.ceil(size[1 - order[0]] / (shapePerCTA[0] * warpsPerCTA[1 - order[0]]));
      for (let i = 0; i < rows && grid; i++) {
        for (let j = 0; j < gridColumns; j++) {
          grid.appendChild(createWaveBlock(document, tritonConfig));
        }
      }
    }
}());