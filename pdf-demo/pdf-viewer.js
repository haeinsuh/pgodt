// Ensure PDF.js is loaded
const pdfjsLib = window['pdfjs-dist/build/pdf'];

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let scale = 1.0;
let rotation = 0;
let selectedFile = null;

// UI Elements
const emptyState = document.getElementById('pdf-empty-state');
const canvasWrapper = document.getElementById('canvas-wrapper');
const fileInput = document.getElementById('pdf-upload');

// Toolbar Elements
const paginationControls = document.querySelector('.pagination-controls');
const zoomControls = document.querySelector('.zoom-controls');
const actionControls = document.querySelector('.action-controls');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const firstPageBtn = document.getElementById('first-page');
const lastPageBtn = document.getElementById('last-page');
const pageNumInput = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomSelect = document.getElementById('zoom-select');
const fileNameDisplay = document.getElementById('file-name-display');


/**
 * Render a single page into a given container
 */
async function renderPage(num, canvas, textLayerDiv) {
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: scale, rotation: rotation });
    
    // CSS properties for crisp rendering at high DPI displays
    const outputScale = window.devicePixelRatio || 1;
    
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height =  Math.floor(viewport.height) + "px";
    
    const ctx = canvas.getContext('2d');
    const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

    const renderContext = {
        canvasContext: ctx,
        transform: transform,
        viewport: viewport
    };
    
    // Clear and configure text layer
    textLayerDiv.innerHTML = '';
    textLayerDiv.style.width = canvas.style.width;
    textLayerDiv.style.height = canvas.style.height;
    textLayerDiv.style.setProperty('--scale-factor', viewport.scale);

    await page.render(renderContext).promise;

    // Build Text Layer for Selecting and Searching
    const textContent = await page.getTextContent();
    pdfjsLib.renderTextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport: viewport,
        textDivs: []
    });
}

/**
 * Renders all pages in the PDF sequentially
 */
async function renderAllPages() {
    canvasWrapper.innerHTML = ''; // Clear container
    
    for(let i = 1; i <= pdfDoc.numPages; i++) {
        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page-container';
        pageContainer.id = `page-container-${i}`;
        
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-canvas';
        
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        
        pageContainer.appendChild(canvas);
        pageContainer.appendChild(textLayerDiv);
        canvasWrapper.appendChild(pageContainer);
        
        // Render pages sequentially to avoid browser lockup on large PDFs
        await renderPage(i, canvas, textLayerDiv);
    }
}

// Track scrolling to update page number
canvasWrapper.addEventListener('scroll', () => {
    let currentPage = 1;
    let minDistance = Infinity;
    
    for(let i = 1; i <= pdfDoc.numPages; i++) {
        const pageDiv = document.getElementById(`page-container-${i}`);
        if(pageDiv) {
            // Calculate distance from top of wrapper
            const distance = Math.abs(pageDiv.offsetTop - canvasWrapper.scrollTop - canvasWrapper.offsetTop);
            if(distance < minDistance) {
                minDistance = distance;
                currentPage = i;
            }
        }
    }
    
    if (pageNumInput.value != currentPage) {
        pageNumInput.value = currentPage;
        updateBookmarkState();
    }
});

// Helper to scroll to a specific page
function scrollToPage(num) {
    if(num < 1 || num > pdfDoc.numPages) return;
    const pageDiv = document.getElementById(`page-container-${num}`);
    if(pageDiv) {
        // Scroll the canvasWrapper so the pageDiv is at the top
        canvasWrapper.scrollTo({
            top: pageDiv.offsetTop - canvasWrapper.offsetTop,
            behavior: 'smooth'
        });
    }
}

// Event Listeners for Pagination Navigation
firstPageBtn.addEventListener('click', () => scrollToPage(1));
lastPageBtn.addEventListener('click', () => scrollToPage(pdfDoc.numPages));
prevPageBtn.addEventListener('click', () => scrollToPage(parseInt(pageNumInput.value) - 1));
nextPageBtn.addEventListener('click', () => scrollToPage(parseInt(pageNumInput.value) + 1));

pageNumInput.addEventListener('change', (e) => {
    scrollToPage(parseInt(e.target.value));
});


// Zoom Controls
function updateZoomLevelDisplay() {
    let exactScale = Math.round(scale * 100) / 100;
    
    // Check if exact matches any option
    let matchFound = false;
    Array.from(zoomSelect.options).forEach(opt => {
        if(parseFloat(opt.value) === exactScale) {
            opt.selected = true;
            matchFound = true;
        }
    });
    
    // If not found, you could potentially add a custom option here, but for simplicity we rely on the nearest or just ignore dropdown selection change
}

zoomInBtn.addEventListener('click', () => {
    if(scale >= 3.0) return;
    scale += 0.25;
    updateZoomLevelDisplay();
    renderAllPages();
});

zoomOutBtn.addEventListener('click', () => {
    if(scale <= 0.5) return;
    scale -= 0.25;
    updateZoomLevelDisplay();
    renderAllPages();
});

zoomSelect.addEventListener('change', (e) => {
    scale = parseFloat(e.target.value);
    renderAllPages();
});

// Tool modes (Pan)
const modePan = document.getElementById('mode-pan');
let isPanMode = false;
let isPanning = false;
let startX, startY, scrollLeft, scrollTop;

modePan.addEventListener('click', () => {
    isPanMode = !isPanMode;
    if (isPanMode) {
        modePan.classList.add('active');
        canvasWrapper.style.cursor = 'grab';
    } else {
        modePan.classList.remove('active');
        canvasWrapper.style.cursor = 'default';
    }
});

// Panning Mechanics on Canvas Wrapper
canvasWrapper.addEventListener('mousedown', (e) => {
    if(!isPanMode) return;
    isPanning = true;
    canvasWrapper.style.cursor = 'grabbing';
    startX = e.pageX - canvasWrapper.offsetLeft;
    startY = e.pageY - canvasWrapper.offsetTop;
    scrollLeft = canvasWrapper.scrollLeft;
    scrollTop = canvasWrapper.scrollTop;
});

canvasWrapper.addEventListener('mouseleave', () => {
    isPanning = false;
    if(isPanMode) canvasWrapper.style.cursor = 'grab';
});

canvasWrapper.addEventListener('mouseup', () => {
    isPanning = false;
    if(isPanMode) canvasWrapper.style.cursor = 'grab';
});

canvasWrapper.addEventListener('mousemove', (e) => {
    if(!isPanning || !isPanMode) return;
    e.preventDefault();
    const x = e.pageX - canvasWrapper.offsetLeft;
    const y = e.pageY - canvasWrapper.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    canvasWrapper.scrollLeft = scrollLeft - walkX;
    canvasWrapper.scrollTop = scrollTop - walkY;
});

// Sidebar Toggle functionality
const sidebarToggleBtn = document.getElementById('open-sidebar');
const mainSidebar = document.getElementById('main-sidebar');

sidebarToggleBtn.addEventListener('click', () => {
    if(mainSidebar.style.display === 'none') {
        mainSidebar.style.display = 'flex';
    } else {
        mainSidebar.style.display = 'none';
    }
});

// Comment Functionality
const commentBtn = document.getElementById('comment-btn');
const commentPanelContainer = document.getElementById('comment-panel');
const commentCloseBtn = document.getElementById('comment-close');
const commentInput = document.getElementById('comment-input');
const addCommentSubmit = document.getElementById('add-comment-submit');
const commentList = document.getElementById('comment-list');

let comments = [];

commentBtn.addEventListener('click', () => {
    if(!selectedFile) {
        alert("먼저 PDF 파일을 선택해주세요.");
        return;
    }
    commentPanelContainer.style.display = commentPanelContainer.style.display === 'none' ? 'flex' : 'none';
    if(commentPanelContainer.style.display === 'flex') {
        commentInput.focus();
        renderComments(); // Make sure list is up to date
    }
});

commentCloseBtn.addEventListener('click', () => {
    commentPanelContainer.style.display = 'none';
});

addCommentSubmit.addEventListener('click', () => {
    const text = commentInput.value.trim();
    if(!text) return;
    
    // Create new comment object, associate with current page
    const currentPageNum = parseInt(pageNumInput.value) || 1;
    const newComment = {
        id: Date.now(),
        page: currentPageNum,
        text: text,
        timestamp: new Date().toLocaleString()
    };
    
    comments.push(newComment);
    commentInput.value = ''; // clear input
    renderComments();
});

function renderComments() {
    commentList.innerHTML = '';
    if(comments.length === 0) {
        commentList.innerHTML = '<div style="color: #64748b; text-align: center; padding: 2rem 0;">아직 작성된 댓글이 없습니다.</div>';
        return;
    }
    
    // Sort recently added first
    const sortedComments = [...comments].sort((a, b) => b.id - a.id);
    
    sortedComments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        
        const header = document.createElement('div');
        header.className = 'comment-item-header';
        
        const pageBadge = document.createElement('span');
        pageBadge.style.fontWeight = '600';
        pageBadge.style.color = 'var(--accent-color)';
        pageBadge.textContent = `Page ${comment.page}`;
        
        const timeBadge = document.createElement('span');
        timeBadge.textContent = comment.timestamp;
        
        header.appendChild(pageBadge);
        header.appendChild(timeBadge);
        
        const textBody = document.createElement('div');
        textBody.textContent = comment.text;
        
        commentItem.appendChild(header);
        commentItem.appendChild(textBody);
        
        // Click to jump to the page
        commentItem.style.cursor = 'pointer';
        commentItem.addEventListener('click', () => scrollToPage(comment.page));
        
        commentList.appendChild(commentItem);
    });
}


function loadPdf(file) {
    const fileReader = new FileReader();

    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);

        // Hide empty state, show canvas wrapper and toolbars
        emptyState.style.display = 'none';
        canvasWrapper.style.display = 'flex';
        actionControls.style.display = 'flex';
        
        // Reset states
        scale = 1.0;
        rotation = 0;
        updateZoomLevelDisplay();

        // Load the PDF
        const loadingTask = pdfjsLib.getDocument(typedarray);
        loadingTask.promise.then(function(pdf) {
            pdfDoc = pdf;
            pageCountSpan.textContent = pdf.numPages;
            pageNumInput.value = 1;
            bookmarks = [];
            comments = [];
            updateBookmarkState();
            if(commentPanelContainer) commentPanelContainer.style.display = 'none';
            
            // Render all pages for scrolling
            renderAllPages();
        }, function (reason) {
            console.error(reason);
            alert("Error loading PDF: " + reason.message);
        });
    };

    fileReader.readAsArrayBuffer(file);
}

// Handle File Upload Auto-Open
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file && file.type === "application/pdf") {
        selectedFile = file;
        fileNameDisplay.textContent = file.name;
        
        // Auto-open requested by user
        loadPdf(selectedFile);
    } else {
        selectedFile = null;
        fileNameDisplay.textContent = "선택된 파일 없음";
        alert("Please select a valid PDF file.");
    }
});

// Download and Print Controls
document.getElementById('download-btn').addEventListener('click', () => {
    if(!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('print-btn').addEventListener('click', () => {
    if(!selectedFile) return;
    
    // Create an invisible iframe to print the PDF natively
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = URL.createObjectURL(selectedFile);
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            
            // Clean up after print dialog is closed
            setTimeout(() => {
                document.body.removeChild(iframe);
                URL.revokeObjectURL(iframe.src);
            }, 1000);
        }, 100);
    };
});

// Bookmark Feature
const bookmarkBtn = document.getElementById('bookmark-btn');
let bookmarks = [];

bookmarkBtn.addEventListener('click', () => {
    if(!selectedFile) return;
    const currentPageNum = parseInt(pageNumInput.value) || 1;
    
    // Check if current page is already bookmarked
    if(!bookmarks.includes(currentPageNum)) {
        bookmarks.push(currentPageNum);
        bookmarks.sort((a,b) => a - b);
        bookmarkBtn.classList.add('active'); // highlight button to show page is bookmarked
        alert("Page " + currentPageNum + " has been bookmarked!");
    } else {
        bookmarks = bookmarks.filter(p => p !== currentPageNum);
        bookmarkBtn.classList.remove('active');
        alert("Bookmark for Page " + currentPageNum + " removed.");
    }
});

// Update bookmark button state on page change
function updateBookmarkState() {
    const currentPageNum = parseInt(pageNumInput.value) || 1;
    if(bookmarks.includes(currentPageNum)) {
        bookmarkBtn.classList.add('active');
    } else {
        bookmarkBtn.classList.remove('active');
    }
}


