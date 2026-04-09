// PDF Compare DOM Elements
const compareSetup = document.getElementById('compare-setup');
const compareViewer = document.getElementById('compare-viewer');
const startCompareBtn = document.getElementById('start-compare-btn');
const exitCompareBtn = document.getElementById('exit-compare-btn');

// Dropzones
const dropzone1 = document.getElementById('compare-zone-1');
const fileInput1 = document.getElementById('compare-file-1');
const status1 = document.getElementById('compare-status-1');

const dropzone2 = document.getElementById('compare-zone-2');
const fileInput2 = document.getElementById('compare-file-2');
const status2 = document.getElementById('compare-status-2');

// Viewer Elements
const renderContainer1 = document.getElementById('compare-render-1');
const renderContainer2 = document.getElementById('compare-render-2');
const scrollContainer1 = document.getElementById('compare-scroll-1');
const scrollContainer2 = document.getElementById('compare-scroll-2');

const title1 = document.getElementById('pane-title-1');
const title2 = document.getElementById('pane-title-2');

const pageNum1 = document.getElementById('compare-page-1');
const pageNum2 = document.getElementById('compare-page-2');
const totalPages1 = document.getElementById('compare-total-1');
const totalPages2 = document.getElementById('compare-total-2');

// Controls
const compareZoomSelect = document.getElementById('compare-zoom-select');
const compareZoomInBtn = document.getElementById('compare-zoom-in');
const compareZoomOutBtn = document.getElementById('compare-zoom-out');
const syncToggle = document.getElementById('sync-scroll-toggle');
const diffToggle = document.getElementById('diff-highlight-toggle');

// State
let pdfFile1 = null;
let pdfFile2 = null;
let pdfDoc1 = null;
let pdfDoc2 = null;
let currentZoom = 1.0;
let isSyncing = true;
let isScrolling1 = false;
let isScrolling2 = false;

// Canvas tracking for diff
let renderedCanvases1 = [];
let renderedCanvases2 = [];
let diffOverlays = [];
let isDiffMode = true;

// --- Upload Logic ---
function setupDropzone(zone, input, statusEl, isFirst) {
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if(e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0], statusEl, isFirst);
        }
    });

    input.addEventListener('change', (e) => {
        if(e.target.files.length) {
            handleFileSelect(e.target.files[0], statusEl, isFirst);
        }
    });
}

function handleFileSelect(file, statusEl, isFirst) {
    if (file && file.type === "application/pdf") {
        if(isFirst) {
            pdfFile1 = file;
            title1.textContent = file.name;
        } else {
            pdfFile2 = file;
            title2.textContent = file.name;
        }
        statusEl.textContent = file.name;
        statusEl.style.color = "var(--text-dark)";
        statusEl.style.fontWeight = "600";
        checkStartReady();
    } else {
        alert("PDF 파일만 업로드 가능합니다.");
    }
}

function checkStartReady() {
    if (pdfFile1 && pdfFile2) {
        startCompareBtn.disabled = false;
        startCompareBtn.classList.remove('disabled');
    }
}

setupDropzone(dropzone1, fileInput1, status1, true);
setupDropzone(dropzone2, fileInput2, status2, false);

// --- Compare Logic ---
startCompareBtn.addEventListener('click', () => {
    compareSetup.style.display = 'none';
    compareViewer.style.display = 'flex';
    loadComparePdfs();
});

exitCompareBtn.addEventListener('click', () => {
    compareViewer.style.display = 'none';
    compareSetup.style.display = 'flex';
    // Clear renders to save memory
    renderContainer1.innerHTML = '';
    renderContainer2.innerHTML = '';
    pdfDoc1 = null;
    pdfDoc2 = null;
    renderedCanvases1 = [];
    renderedCanvases2 = [];
    diffOverlays = [];
    // Reset diff toggle
    if(diffToggle) diffToggle.checked = true;
    isDiffMode = true;
});

async function loadComparePdfs() {
    renderContainer1.innerHTML = '<div class="spinner-icon"><i class="bx bx-loader-alt bx-spin"></i></div>';
    renderContainer2.innerHTML = '<div class="spinner-icon"><i class="bx bx-loader-alt bx-spin"></i></div>';
    // Enable diff mode by default
    isDiffMode = true;
    if (diffToggle) diffToggle.checked = true;

    try {
        const fileReader1 = new FileReader();
        const fileReader2 = new FileReader();

        const loadDoc1 = new Promise((resolve) => {
            fileReader1.onload = async function() {
                const typedarray = new Uint8Array(this.result);
                pdfDoc1 = await pdfjsLib.getDocument(typedarray).promise;
                totalPages1.textContent = pdfDoc1.numPages;
                resolve();
            };
            fileReader1.readAsArrayBuffer(pdfFile1);
        });

        const loadDoc2 = new Promise((resolve) => {
            fileReader2.onload = async function() {
                const typedarray = new Uint8Array(this.result);
                pdfDoc2 = await pdfjsLib.getDocument(typedarray).promise;
                totalPages2.textContent = pdfDoc2.numPages;
                resolve();
            };
            fileReader2.readAsArrayBuffer(pdfFile2);
        });

        await Promise.all([loadDoc1, loadDoc2]);
        await renderBothDocs();

    } catch(err) {
        console.error("Error loading comparing PDFs", err);
        alert("PDF를 불러오는 중 오류가 발생했습니다.");
        exitCompareBtn.click();
    }
}

async function renderBothDocs() {
    renderContainer1.innerHTML = '';
    renderContainer2.innerHTML = '';
    renderedCanvases1 = [];
    renderedCanvases2 = [];
    diffOverlays = [];

    // Render all pages for Document 1
    for(let i = 1; i <= pdfDoc1.numPages; i++) {
        const canvas = await renderComparePage(pdfDoc1, i, renderContainer1);
        renderedCanvases1.push(canvas);
    }

    // Render all pages for Document 2
    for(let i = 1; i <= pdfDoc2.numPages; i++) {
        const canvas = await renderComparePage(pdfDoc2, i, renderContainer2);
        renderedCanvases2.push(canvas);
    }

    setupIntersectionObservers();

    // Apply diff overlays if diff mode is enabled
    if (isDiffMode) {
        applyDiffOverlays();
    }
}

async function renderComparePage(doc, pageNum, container) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: currentZoom });

    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-page-wrapper compare-page';
    wrapper.dataset.pageNumber = pageNum;
    wrapper.style.position = 'relative';
    wrapper.style.marginBottom = '20px';
    wrapper.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
        canvasContext: ctx,
        viewport: viewport
    };

    wrapper.appendChild(canvas);
    container.appendChild(wrapper);

    await page.render(renderContext).promise;

    return canvas;
}

// --- Diff Highlight Logic ---

/**
 * Compares two canvases using 8x8 block analysis and returns highlighted diff overlay
 */
function computeDiffOverlay(canvas1, canvas2) {
    const THRESHOLD = 20;  // per-channel diff threshold
    const BLOCK = 8;       // block size for cleaner highlights

    // Normalize to same dimensions for comparison
    const w = Math.min(canvas1.width, canvas2.width);
    const h = Math.min(canvas1.height, canvas2.height);

    // Offscreen canvas for pixel extraction
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const octx = offscreen.getContext('2d');

    // Extract pixels from canvas1
    octx.drawImage(canvas1, 0, 0, w, h);
    const data1 = octx.getImageData(0, 0, w, h).data;

    // Extract pixels from canvas2
    octx.clearRect(0, 0, w, h);
    octx.drawImage(canvas2, 0, 0, w, h);
    const data2 = octx.getImageData(0, 0, w, h).data;

    // Build diff map using block analysis
    const overlayData = new Uint8ClampedArray(w * h * 4);
    let hasDiff = false;

    // First pass: mark individual differing pixels
    const diffMap = new Uint8Array(w * h);
    for (let j = 0; j < data1.length; j += 4) {
        const dx = Math.abs(data1[j]     - data2[j]);
        const dy = Math.abs(data1[j + 1] - data2[j + 1]);
        const dz = Math.abs(data1[j + 2] - data2[j + 2]);
        if (dx > THRESHOLD || dy > THRESHOLD || dz > THRESHOLD) {
            diffMap[j / 4] = 1;
        }
    }

    // Second pass: if any pixel in an 8x8 block differs, highlight the whole block
    for (let by = 0; by < h; by += BLOCK) {
        for (let bx = 0; bx < w; bx += BLOCK) {
            let blockHasDiff = false;
            const bw = Math.min(BLOCK, w - bx);
            const bh = Math.min(BLOCK, h - by);

            // Check block for any diff
            outer:
            for (let dy = 0; dy < bh; dy++) {
                for (let dx = 0; dx < bw; dx++) {
                    if (diffMap[(by + dy) * w + (bx + dx)]) {
                        blockHasDiff = true;
                        break outer;
                    }
                }
            }

            if (blockHasDiff) {
                hasDiff = true;
                // Fill the block with yellow highlight
                for (let dy = 0; dy < bh; dy++) {
                    for (let dx = 0; dx < bw; dx++) {
                        const idx = ((by + dy) * w + (bx + dx)) * 4;
                        overlayData[idx]     = 255;  // R
                        overlayData[idx + 1] = 230;  // G  → yellow
                        overlayData[idx + 2] = 0;    // B
                        overlayData[idx + 3] = 170;  // A
                    }
                }
            }
        }
    }

    if (!hasDiff) return null;

    return { imageData: new ImageData(overlayData, w, h), w, h };
}

/**
 * Creates an absolutely-positioned overlay canvas on top of a rendered PDF canvas
 */
function createOverlayCanvas(targetCanvas, diffResult) {
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = targetCanvas.width;
    overlayCanvas.height = targetCanvas.height;
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.top = '0';
    overlayCanvas.style.left = '0';
    overlayCanvas.style.width = (targetCanvas.style.width || targetCanvas.width + 'px');
    overlayCanvas.style.height = (targetCanvas.style.height || targetCanvas.height + 'px');
    overlayCanvas.style.pointerEvents = 'none';
    overlayCanvas.className = 'diff-overlay';

    const octx = overlayCanvas.getContext('2d');

    // Draw the diff image data onto a temp canvas first, then scale to target
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = diffResult.w;
    tempCanvas.height = diffResult.h;
    tempCanvas.getContext('2d').putImageData(diffResult.imageData, 0, 0);

    octx.drawImage(tempCanvas, 0, 0, targetCanvas.width, targetCanvas.height);

    return overlayCanvas;
}

function applyDiffOverlays() {
    removeDiffOverlays();

    const minPages = Math.min(renderedCanvases1.length, renderedCanvases2.length);

    for (let i = 0; i < minPages; i++) {
        const canvas1 = renderedCanvases1[i];
        const canvas2 = renderedCanvases2[i];

        if (!canvas1 || !canvas2) continue;

        const diffResult = computeDiffOverlay(canvas1, canvas2);
        if (!diffResult) continue;

        const overlay1 = createOverlayCanvas(canvas1, diffResult);
        const overlay2 = createOverlayCanvas(canvas2, diffResult);

        canvas1.parentElement.appendChild(overlay1);
        canvas2.parentElement.appendChild(overlay2);

        diffOverlays.push(overlay1, overlay2);
    }
}

function removeDiffOverlays() {
    diffOverlays.forEach(el => el.remove());
    diffOverlays = [];
    // Safety cleanup
    document.querySelectorAll('.diff-overlay').forEach(el => el.remove());
}

// Diff toggle event
if (diffToggle) {
    diffToggle.addEventListener('change', (e) => {
        isDiffMode = e.target.checked;
        if (isDiffMode) {
            applyDiffOverlays();
        } else {
            removeDiffOverlays();
        }
    });
}

// --- Zoom Logic ---
compareZoomSelect.addEventListener('change', async (e) => {
    currentZoom = parseFloat(e.target.value);
    await renderBothDocs();
});

compareZoomInBtn.addEventListener('click', async () => {
    const options = Array.from(compareZoomSelect.options).map(opt => parseFloat(opt.value));
    const currentIndex = options.indexOf(currentZoom);
    if(currentIndex < options.length - 1) {
        currentZoom = options[currentIndex + 1];
        compareZoomSelect.value = currentZoom;
        await renderBothDocs();
    }
});

compareZoomOutBtn.addEventListener('click', async () => {
    const options = Array.from(compareZoomSelect.options).map(opt => parseFloat(opt.value));
    const currentIndex = options.indexOf(currentZoom);
    if(currentIndex > 0) {
        currentZoom = options[currentIndex - 1];
        compareZoomSelect.value = currentZoom;
        await renderBothDocs();
    }
});

// --- Synchronization Logic ---
syncToggle.addEventListener('change', (e) => {
    isSyncing = e.target.checked;
});

scrollContainer1.addEventListener('scroll', () => {
    if(!isSyncing || isScrolling2) {
        isScrolling2 = false;
        return;
    }
    isScrolling1 = true;

    // Calculate percentage scroll instead of raw pixels, so differing height documents sync proportionally
    const percentage = scrollContainer1.scrollTop / (scrollContainer1.scrollHeight - scrollContainer1.clientHeight);
    scrollContainer2.scrollTop = percentage * (scrollContainer2.scrollHeight - scrollContainer2.clientHeight);
});

scrollContainer2.addEventListener('scroll', () => {
    if(!isSyncing || isScrolling1) {
        isScrolling1 = false;
        return;
    }
    isScrolling2 = true;

    const percentage = scrollContainer2.scrollTop / (scrollContainer2.scrollHeight - scrollContainer2.clientHeight);
    scrollContainer1.scrollTop = percentage * (scrollContainer1.scrollHeight - scrollContainer1.clientHeight);
});

// Update Page Number reading while scrolling
function setupIntersectionObservers() {
    const observer1 = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                pageNum1.textContent = entry.target.dataset.pageNumber;
            }
        });
    }, { threshold: 0.5, root: scrollContainer1 });

    document.querySelectorAll('#compare-render-1 .compare-page').forEach(page => observer1.observe(page));

    const observer2 = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                pageNum2.textContent = entry.target.dataset.pageNumber;
            }
        });
    }, { threshold: 0.5, root: scrollContainer2 });

    document.querySelectorAll('#compare-render-2 .compare-page').forEach(page => observer2.observe(page));
}

// Split Divider Resizing
const divider = document.querySelector('.split-divider');
const pane1 = document.getElementById('compare-pane-1');
const pane2 = document.getElementById('compare-pane-2');

let isDragging = false;

divider.addEventListener('mousedown', (e) => {
    isDragging = true;
    document.body.style.cursor = 'col-resize';
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const container = document.querySelector('.split-view');
    const containerRect = container.getBoundingClientRect();

    // Calculate percentage based on mouse position relative to container
    let percentage = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Constrain to prevent hiding entirely
    if (percentage < 10) percentage = 10;
    if (percentage > 90) percentage = 90;

    pane1.style.flex = `0 0 ${percentage}%`;
    pane2.style.flex = `0 0 ${100 - percentage}%`;
});

document.addEventListener('mouseup', () => {
    if(isDragging) {
        isDragging = false;
        document.body.style.cursor = 'default';
    }
});
