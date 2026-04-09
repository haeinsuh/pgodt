// File Converter DOM Elements
const fileConverterSection = document.getElementById('file-converter');
const uploadZone = fileConverterSection.querySelector('#converter-upload-zone');
const fileInputConverter = fileConverterSection.querySelector('#converter-file-input');
const fileListContainer = fileConverterSection.querySelector('#file-list-container');
const fileListEl = fileConverterSection.querySelector('#converter-file-list');
const fileCountBadge = fileConverterSection.querySelector('#file-count-badge');
const converterSettings = fileConverterSection.querySelector('#converter-settings');
const clearFilesBtn = fileConverterSection.querySelector('#clear-files-btn');
const generatePdfBtn = fileConverterSection.querySelector('#generate-pdf-btn');
const conversionStatus = fileConverterSection.querySelector('#conversion-status');
const statusText = fileConverterSection.querySelector('#status-text');
const spinnerIcon = conversionStatus.querySelector('.spinner-icon');
const successIcon = conversionStatus.querySelector('.success-icon');

let uploadedFiles = []; // Store file objects

// --- Drag & Drop Handlers ---
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInputConverter.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    e.target.value = ''; // Reset input so same file can be selected again
});

function handleFiles(files) {
    if(!files || files.length === 0) return;
    
    // Filter supported formats
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'text/plain'];
    const newFiles = Array.from(files).filter(file => validTypes.includes(file.type));
    
    if(newFiles.length < files.length) {
        alert("일부 파일은 지원되지 않는 형식입니다. JPG, PNG 이미지나 TXT 파일만 업로드 가능합니다.");
    }

    const hasTxt = newFiles.some(f => f.type === 'text/plain');
    if (hasTxt) {
        alert("주의: .txt 파일의 한글은 현재 지원되지 않아 PDF에서 공백으로 보일 수 있습니다. 이미지를 사용하는 것을 권장합니다.");
    }

    newFiles.forEach(file => {
        // Generate an ID for tracking
        file.customId = Math.random().toString(36).substr(2, 9);
        uploadedFiles.push(file);
    });

    renderFileList();
}

function renderFileList() {
    fileListEl.innerHTML = '';
    
    if(uploadedFiles.length === 0) {
        fileListContainer.style.display = 'none';
        converterSettings.style.display = 'none';
        return;
    }
    
    fileListContainer.style.display = 'block';
    converterSettings.style.display = 'flex';
    fileCountBadge.textContent = uploadedFiles.length;

    uploadedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.draggable = true;
        li.dataset.id = file.customId;
        
        // Setup Drag events for reordering
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);

        // Preview Element
        const previewEl = document.createElement('div');
        previewEl.className = 'file-item-preview';
        
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '4px';
            previewEl.appendChild(img);
        } else if (file.type === 'text/plain') {
            previewEl.innerHTML = "<i class='bx bx-text'></i>";
        }

        // Info Element
        const infoEl = document.createElement('div');
        infoEl.className = 'file-item-info';
        
        const nameEl = document.createElement('div');
        nameEl.className = 'file-item-name';
        nameEl.textContent = file.name;
        
        const metaEl = document.createElement('div');
        metaEl.className = 'file-item-meta';
        metaEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;
        
        infoEl.appendChild(nameEl);
        infoEl.appendChild(metaEl);

        // Actions Element
        const actionsEl = document.createElement('div');
        actionsEl.className = 'file-item-actions';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'toolbar-btn icon-btn';
        removeBtn.innerHTML = "<i class='bx bx-trash'></i>";
        removeBtn.title = "삭제";
        // prevent drag triggering when clicking delete
        removeBtn.onmousedown = (e) => e.stopPropagation(); 
        removeBtn.onclick = () => removeFile(file.customId);
        
        actionsEl.appendChild(removeBtn);

        li.appendChild(previewEl);
        li.appendChild(infoEl);
        li.appendChild(actionsEl);

        fileListEl.appendChild(li);
    });
}

function removeFile(id) {
    uploadedFiles = uploadedFiles.filter(f => f.customId !== id);
    renderFileList();
}

clearFilesBtn.addEventListener('click', () => {
    uploadedFiles = [];
    renderFileList();
});

// --- Drag & Drop Reordering Logic ---
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    setTimeout(() => this.classList.add('dragging'), 0);
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = this;
    if(target && target !== draggedItem && target.className.includes('file-item')) {
        const bounding = target.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        if(e.clientY - offset > 0) {
            target.style.borderBottom = "2px solid var(--accent-color)";
            target.style.borderTop = "";
        } else {
            target.style.borderTop = "2px solid var(--accent-color)";
            target.style.borderBottom = "";
        }
    }
}

function handleDrop(e) {
    e.stopPropagation();
    const target = this;
    
    // Clean borders
    document.querySelectorAll('.file-item').forEach(item => {
        item.style.borderTop = "";
        item.style.borderBottom = "";
    });

    if(draggedItem !== target && target.className.includes('file-item')) {
        const listItems = Array.from(fileListEl.children);
        const draggedIndex = listItems.indexOf(draggedItem);
        let targetIndex = listItems.indexOf(target);

        // Calculate drop position
        const bounding = target.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        if(e.clientY - offset > 0) {
           targetIndex++; 
        }

        // Reorder Array
        const [removed] = uploadedFiles.splice(draggedIndex, 1);
        
        // Adjust indices if target was after the dragged item
        if(targetIndex > draggedIndex) {
            targetIndex--;
        }
        
        uploadedFiles.splice(targetIndex, 0, removed);
        renderFileList();
    }
    return false;
}

function handleDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.file-item').forEach(item => {
        item.style.borderTop = "";
        item.style.borderBottom = "";
    });
}

// --- PDF Generation Logic ---
generatePdfBtn.addEventListener('click', async () => {
    if(uploadedFiles.length === 0) return;
    
    // UI Update
    uploadZone.style.display = 'none';
    fileListContainer.style.display = 'none';
    converterSettings.style.display = 'none';
    
    conversionStatus.style.display = 'flex';
    spinnerIcon.style.display = 'block';
    successIcon.style.display = 'none';
    statusText.textContent = 'PDF 변환 중...';
    
    // Get Settings
    const orientation = fileConverterSection.querySelector('#pdf-orientation').value;
    const format = fileConverterSection.querySelector('#pdf-format').value;
    
    console.log('Generating PDF with settings:', { orientation, format, fileCount: uploadedFiles.length });

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation, unit: 'mm', format });
        
        for (let i = 0; i < uploadedFiles.length; i++) {
            const file = uploadedFiles[i];
            
            // Format dimensions (mm)
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            // Add new page after the first one
            if(i > 0) doc.addPage(format, orientation);
            
            statusText.textContent = `처리 중... (${i+1}/${uploadedFiles.length})`;
            
            if (file.type.startsWith('image/')) {
                await addImageToPdf(doc, file, pageWidth, pageHeight);
            } else if (file.type === 'text/plain') {
                await addTextToPdf(doc, file, pageWidth, pageHeight);
            }
        }
        
        statusText.textContent = '완료! 파일 다운로드 중...';
        spinnerIcon.style.display = 'none';
        successIcon.style.display = 'block';
        
        // Save PDF
        console.log('Saving PDF...');
        const fileName = 'converted_document.pdf';
        // Use unified download function from app.js
        downloadPdf(doc, fileName);
        
        /* 
        setTimeout(() => {
            uploadedFiles = [];
            renderFileList();
            uploadZone.style.display = 'block';
            conversionStatus.style.display = 'none';
        }, 5000);
        */

    } catch (error) {
        console.error("PDF Generation Error:", error);
        statusText.textContent = '오류 발생: ' + error.message;
        spinnerIcon.style.display = 'none';
        setTimeout(() => {
            uploadZone.style.display = 'block';
            fileListContainer.style.display = 'block';
            converterSettings.style.display = 'flex';
            conversionStatus.style.display = 'none';
        }, 3000);
    }
});

function addImageToPdf(doc, file, pageWidth, pageHeight) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Keep original aspect ratio but fit inside the page
                const margin = 10;
                const targetWidth = pageWidth - (margin * 2);
                const targetHeight = pageHeight - (margin * 2);
                
                const imgRatio = img.width / img.height;
                const targetRatio = targetWidth / targetHeight;
                
                let finalWidth, finalHeight;
                if(imgRatio > targetRatio) {
                    finalWidth = targetWidth;
                    finalHeight = targetWidth / imgRatio;
                } else {
                    finalHeight = targetHeight;
                    finalWidth = targetHeight * imgRatio;
                }
                
                const x = (pageWidth - finalWidth) / 2;
                const y = (pageHeight - finalHeight) / 2;
                
                doc.addImage(e.target.result, 'JPEG', x, y, finalWidth, finalHeight);
                resolve();
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function addTextToPdf(doc, file, pageWidth, pageHeight) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            
            const margin = 20;
            const textWidth = pageWidth - (margin * 2);
            
            // Use built-in Times font as a fallback (Korean character support might require custom fonts)
            doc.setFont("times", "normal");
            doc.setFontSize(12);
            
            // Split text to fit width
            const lines = doc.splitTextToSize(text, textWidth);
            
            const lineSpacing = 6; // approximate mm
            let cursorY = margin;
            
            for(let i = 0; i < lines.length; i++) {
                if(cursorY + lineSpacing > pageHeight - margin) {
                    const orientation = document.getElementById('pdf-orientation').value;
                    const format = document.getElementById('pdf-format').value;
                    doc.addPage(format, orientation);
                    cursorY = margin;
                }
                doc.text(lines[i], margin, cursorY);
                cursorY += lineSpacing; 
            }
            resolve();
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}
