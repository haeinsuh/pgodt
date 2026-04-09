// --- Watermark Module ---

const wmUploadZone  = document.getElementById('wm-upload-zone');
const wmFileInput   = document.getElementById('wm-file-input');
const wmFileName    = document.getElementById('wm-file-name');
const wmDownloadBtn = document.getElementById('wm-download-btn');
const wmPreviewCanvas = document.getElementById('wm-preview-canvas');
const wmEmptyState  = document.getElementById('wm-empty-state');
const wmLoading     = document.getElementById('wm-loading');
const wmPreviewNav  = document.getElementById('wm-preview-nav');
const wmCurPage     = document.getElementById('wm-cur-page');
const wmTotalPages  = document.getElementById('wm-total-pages');
const wmPrevPageBtn = document.getElementById('wm-prev-page');
const wmNextPageBtn = document.getElementById('wm-next-page');

// Option inputs
const wmText         = document.getElementById('wm-text');
const wmColor        = document.getElementById('wm-color');
const wmLayout       = document.getElementById('wm-layout');
const wmPages        = document.getElementById('wm-pages');

// Sliders and Number Inputs
const wmFontSize     = document.getElementById('wm-font-size');
const wmFontSizeNum  = document.getElementById('wm-font-size-num');
const wmOpacity      = document.getElementById('wm-opacity');
const wmOpacityNum   = document.getElementById('wm-opacity-num');
const wmRotation     = document.getElementById('wm-rotation');
const wmRotationNum  = document.getElementById('wm-rotation-num');
const wmSpacingX     = document.getElementById('wm-spacing-x');
const wmSpacingXNum  = document.getElementById('wm-spacing-x-num');
const wmSpacingY     = document.getElementById('wm-spacing-y');
const wmSpacingYNum  = document.getElementById('wm-spacing-y-num');

// Preview Fit toggle
const wmFitToggle    = document.getElementById('wm-fit-toggle');

// State
let wmPdfDoc         = null;
let wmPdfFile        = null;
let wmCurrentPreview = 1;
let previewTimeout   = null;

// --- Initialization & Listeners ---

// Fit Page toggle logic
if (wmFitToggle) {
    wmFitToggle.addEventListener('change', () => {
        if (wmFitToggle.checked) {
            wmPreviewCanvas.classList.add('fit-page');
        } else {
            wmPreviewCanvas.classList.remove('fit-page');
        }
    });
}

function triggerLivePreview() {
    if (!wmPdfDoc) return;
    if (previewTimeout) clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
        renderWmPreview(wmCurrentPreview);
    }, 300);
}

/**
 * Syncs a slider and a number input
 */
function setupSync(slider, numberInput) {
    if (!slider || !numberInput) return;
    // Slider -> Number
    slider.addEventListener('input', () => {
        numberInput.value = slider.value;
        triggerLivePreview();
    });
    // Number -> Slider
    numberInput.addEventListener('input', () => {
        const val = parseInt(numberInput.value);
        if (!isNaN(val)) {
            slider.value = val;
            triggerLivePreview();
        }
    });
}

// Setup all syncing
setupSync(wmFontSize, wmFontSizeNum);
setupSync(wmOpacity,  wmOpacityNum);
setupSync(wmRotation, wmRotationNum);
setupSync(wmSpacingX, wmSpacingXNum);
setupSync(wmSpacingY, wmSpacingYNum);

// Other input changes
if (wmText) wmText.addEventListener('input', triggerLivePreview);
if (wmColor) wmColor.addEventListener('input', triggerLivePreview);
if (wmLayout) wmLayout.addEventListener('change', triggerLivePreview);
if (wmPages) wmPages.addEventListener('change', triggerLivePreview);

// --- Upload Logic ---
if (wmUploadZone) {
    wmUploadZone.addEventListener('click', () => wmFileInput.click());

    wmUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        wmUploadZone.classList.add('dragover');
    });
    wmUploadZone.addEventListener('dragleave', () => wmUploadZone.classList.remove('dragover'));
    wmUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        wmUploadZone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleWmFile(e.dataTransfer.files[0]);
    });
}

if (wmFileInput) {
    wmFileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleWmFile(e.target.files[0]);
    });
}

async function handleWmFile(file) {
    if (file.type !== 'application/pdf') { 
        alert('PDF files only.'); 
        return; 
    }

    wmPdfFile = file;
    if (wmFileName) {
        wmFileName.textContent = 'File: ' + file.name;
        wmFileName.style.display = 'block';
    }

    if (wmLoading) wmLoading.style.display = 'flex';
    if (wmEmptyState) wmEmptyState.style.display = 'none';
    if (wmPreviewCanvas) wmPreviewCanvas.style.display = 'none';

    try {
        const arrayBuffer = await file.arrayBuffer();
        const typedArray  = new Uint8Array(arrayBuffer);
        const loadingTask = pdfjsLib.getDocument(typedArray);
        wmPdfDoc = await loadingTask.promise;

        if (wmTotalPages) wmTotalPages.textContent = wmPdfDoc.numPages;
        wmCurrentPreview = 1;
        if (wmCurPage) wmCurPage.textContent = 1;

        if (wmPreviewNav) wmPreviewNav.style.display = wmPdfDoc.numPages > 1 ? 'flex' : 'none';
        if (wmDownloadBtn) wmDownloadBtn.disabled = false;

        await renderWmPreview(wmCurrentPreview);
    } catch (err) {
        console.error('Error loading PDF:', err);
        alert('Failed to load PDF.');
    }
}

// --- Preview navigation ---
if (wmPrevPageBtn) {
    wmPrevPageBtn.addEventListener('click', async () => {
        if (wmCurrentPreview <= 1) return;
        wmCurrentPreview--;
        if (wmCurPage) wmCurPage.textContent = wmCurrentPreview;
        await renderWmPreview(wmCurrentPreview);
    });
}
if (wmNextPageBtn) {
    wmNextPageBtn.addEventListener('click', async () => {
        if (!wmPdfDoc || wmCurrentPreview >= wmPdfDoc.numPages) return;
        wmCurrentPreview++;
        if (wmCurPage) wmCurPage.textContent = wmCurrentPreview;
        await renderWmPreview(wmCurrentPreview);
    });
}

// --- Core Rendering ---
async function renderWmPreview(pageNum) {
    if (!wmPdfDoc) return;
    if (wmLoading) wmLoading.style.display = 'flex';

    try {
        const page     = await wmPdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        if (wmPreviewCanvas) {
            wmPreviewCanvas.width  = viewport.width;
            wmPreviewCanvas.height = viewport.height;

            const ctx = wmPreviewCanvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;

            applyWatermarkToCanvas(ctx, viewport.width, viewport.height);

            // Apply fit-page class based on toggle state
            if (wmFitToggle && wmFitToggle.checked) {
                wmPreviewCanvas.classList.add('fit-page');
            } else {
                wmPreviewCanvas.classList.remove('fit-page');
            }

            wmPreviewCanvas.style.display = 'block';
        }
        if (wmLoading) wmLoading.style.display  = 'none';
    } catch (err) {
        console.error('Render error:', err);
        if (wmLoading) wmLoading.style.display  = 'none';
    }
}

function applyWatermarkToCanvas(ctx, w, h) {
    const text     = wmText ? (wmText.value.trim() || 'WATERMARK') : 'WATERMARK';
    const fontSize = wmFontSize ? parseInt(wmFontSize.value) : 80;
    const opacity  = wmOpacity ? (parseInt(wmOpacity.value) / 100) : 0.3;
    const angle    = wmRotation ? (parseInt(wmRotation.value) * Math.PI / 180) : -0.78;
    const color    = wmColor ? wmColor.value : '#888888';
    const layout   = wmLayout ? wmLayout.value : 'center';
    const spacingX = wmSpacingX ? parseInt(wmSpacingX.value) : 300;
    const spacingY = wmSpacingY ? parseInt(wmSpacingY.value) : 200;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle   = color;
    ctx.font        = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';

    if (layout === 'center') {
        ctx.translate(w / 2, h / 2);
        ctx.rotate(angle);
        ctx.fillText(text, 0, 0);
    } else if (layout === 'diagonal-repeat') {
        ctx.translate(w / 2, h / 2);
        ctx.rotate(angle);

        const diagLen = Math.sqrt(w * w + h * h);
        const stepX = Math.max(10, spacingX);
        const stepY = Math.max(10, spacingY);
        
        const cols = Math.ceil(diagLen / stepX) * 2 + 2;
        const rows = Math.ceil(diagLen / stepY) * 2 + 2;

        for (let row = -rows; row <= rows; row++) {
            for (let col = -cols; col <= cols; col++) {
                ctx.fillText(text, col * stepX, row * stepY);
            }
        }
    } else if (layout === 'grid') {
        const stepX = Math.max(10, spacingX);
        const stepY = Math.max(10, spacingY);

        for (let y = stepY / 2; y < h; y += stepY) {
            for (let x = stepX / 2; x < w; x += stepX) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                ctx.fillText(text, 0, 0);
                ctx.restore();
            }
        }
    }
    ctx.restore();
}

// --- Download ---
if (wmDownloadBtn) {
    wmDownloadBtn.addEventListener('click', async () => {
        if (!wmPdfDoc || !wmPdfFile) return;
        wmDownloadBtn.disabled = true;
        const originalText = wmDownloadBtn.innerHTML;
        wmDownloadBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Generating...";

        try {
            const { jsPDF } = window.jspdf;
            const pagesMode = wmPages ? wmPages.value : 'all';
            let firstPage   = true;
            let doc         = null;

            for (let i = 1; i <= wmPdfDoc.numPages; i++) {
                const page     = await wmPdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });

                const offCanvas = document.createElement('canvas');
                offCanvas.width  = viewport.width;
                offCanvas.height = viewport.height;
                const ctx = offCanvas.getContext('2d');

                await page.render({ canvasContext: ctx, viewport }).promise;

                const applyWm = pagesMode === 'all' ||
                    (pagesMode === 'first' && i === 1) ||
                    (pagesMode === 'odd'   && i % 2 !== 0) ||
                    (pagesMode === 'even'  && i % 2 === 0);

                if (applyWm) applyWatermarkToCanvas(ctx, offCanvas.width, offCanvas.height);

                const imgData = offCanvas.toDataURL('image/jpeg', 0.92);
                const pdfW = viewport.width / 2;
                const pdfH = viewport.height / 2;
                const ori  = pdfW > pdfH ? 'l' : 'p';

                if (firstPage) {
                    doc = new jsPDF({ orientation: ori, unit: 'pt', format: [pdfW, pdfH] });
                    firstPage = false;
                } else {
                    doc.addPage([pdfW, pdfH], ori);
                }
                doc.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
            }
            
            const finalFileName = wmPdfFile.name.replace('.pdf', '') + '_watermarked.pdf';
            
            // Use unified download function from app.js
            downloadPdf(doc, finalFileName);
        } catch (err) {
            console.error('Download error:', err);
            alert('Error generating PDF.');
        } finally {
            wmDownloadBtn.disabled = false;
            wmDownloadBtn.innerHTML = originalText;
        }
    });
}
