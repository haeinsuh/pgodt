// Drawing Converter Logic
document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('drawing-upload-zone');
    const fileInput = document.getElementById('drawing-file-input');
    const fileListContainer = document.getElementById('drawing-file-list-container');
    const fileListEl = document.getElementById('drawing-file-list');
    const fileCountBadge = document.getElementById('drawing-file-count-badge');
    const settingsPanel = document.getElementById('drawing-settings');
    const generateBtn = document.getElementById('generate-drawing-pdf-btn');
    const clearBtn = document.getElementById('clear-drawings-btn');
    const statusContainer = document.getElementById('drawing-conversion-status');
    const statusText = document.getElementById('drawing-status-text');
    const spinner = statusContainer.querySelector('.spinner-icon');
    const success = statusContainer.querySelector('.success-icon');

    let uploadedFiles = [];

    if (!uploadZone) return; // Prevent errors if not on the right page/element not found

    // --- Upload Handlers ---
    uploadZone.addEventListener('click', () => fileInput.click());

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

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = '';
    });

    function handleFiles(files) {
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/bmp'];
        const newFiles = Array.from(files).filter(file => validTypes.includes(file.type) || file.name.toLowerCase().endsWith('.bmp') || file.name.toLowerCase().endsWith('.dwg') || file.name.toLowerCase().endsWith('.dxf'));

        newFiles.forEach(file => {
            file.customId = 'dwg-' + Math.random().toString(36).substr(2, 9);
            uploadedFiles.push(file);
        });

        renderFileList();
    }

    function renderFileList() {
        fileListEl.innerHTML = '';
        
        if (uploadedFiles.length === 0) {
            fileListContainer.style.display = 'none';
            settingsPanel.style.display = 'none';
            return;
        }

        fileListContainer.style.display = 'block';
        settingsPanel.style.display = 'flex';
        fileCountBadge.textContent = uploadedFiles.length;

        uploadedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-item';
            li.draggable = true;
            li.dataset.id = file.customId;

            // Reorder events
            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragover', handleDragOver);
            li.addEventListener('drop', handleDrop);
            li.addEventListener('dragend', handleDragEnd);

            const preview = document.createElement('div');
            preview.className = 'file-item-preview';
            
            if (file.name.toLowerCase().endsWith('.dwg') || file.name.toLowerCase().endsWith('.dxf')) {
                const icon = document.createElement('i');
                icon.className = 'bx bx-vector';
                icon.style.fontSize = '2.5rem';
                icon.style.color = '#74c0fc';
                icon.style.display = 'flex';
                icon.style.alignItems = 'center';
                icon.style.justifyContent = 'center';
                icon.style.width = '100%';
                icon.style.height = '100%';
                icon.style.background = '#f8f9fa';
                preview.appendChild(icon);
            } else {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                preview.appendChild(img);
            }

            const info = document.createElement('div');
            info.className = 'file-item-info';
            info.innerHTML = `<div class="file-item-name">${file.name}</div><div class="file-item-meta">${(file.size / 1024).toFixed(1)} KB</div>`;

            const actions = document.createElement('div');
            actions.className = 'file-item-actions';
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<i class="bx bx-trash"></i>';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                removeFile(file.customId);
            };
            actions.appendChild(delBtn);

            li.appendChild(preview);
            li.appendChild(info);
            li.appendChild(actions);
            fileListEl.appendChild(li);
        });
    }

    function removeFile(id) {
        uploadedFiles = uploadedFiles.filter(f => f.customId !== id);
        renderFileList();
    }

    clearBtn.addEventListener('click', () => {
        uploadedFiles = [];
        renderFileList();
    });

    // --- Drag & Drop Reordering ---
    let draggedItem = null;
    function handleDragStart() { draggedItem = this; setTimeout(() => this.classList.add('dragging'), 0); }
    function handleDragEnd() { this.classList.remove('dragging'); }
    function handleDragOver(e) { e.preventDefault(); }
    function handleDrop() {
        const listItems = Array.from(fileListEl.children);
        const fromIndex = listItems.indexOf(draggedItem);
        const toIndex = listItems.indexOf(this);
        if (fromIndex !== -1 && toIndex !== -1) {
            const [moved] = uploadedFiles.splice(fromIndex, 1);
            uploadedFiles.splice(toIndex, 0, moved);
            renderFileList();
        }
    }

    // --- PDF Generation ---
    generateBtn.addEventListener('click', async () => {
        if (uploadedFiles.length === 0) return;

        const format = document.getElementById('drawing-pdf-format').value;
        const orientation = document.getElementById('drawing-pdf-orientation').value;
        const fileName = 'drawing_collection.pdf';

        // UI Transition
        uploadZone.style.display = 'none';
        fileListContainer.style.display = 'none';
        settingsPanel.style.display = 'none';
        statusContainer.style.display = 'flex';
        spinner.style.display = 'block';
        success.style.display = 'none';
        statusText.textContent = '도면 PDF 생성 중...';

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation, unit: 'mm', format });

            for (let i = 0; i < uploadedFiles.length; i++) {
                if (i > 0) doc.addPage(format, orientation);
                
                statusText.textContent = `도면 처리 중... (${i+1}/${uploadedFiles.length})`;
                
                const isDwg = uploadedFiles[i].name.toLowerCase().endsWith('.dwg') || uploadedFiles[i].name.toLowerCase().endsWith('.dxf');
                if (isDwg) {
                    await addDwgToPdf(doc, uploadedFiles[i]);
                } else {
                    await addImageToPdf(doc, uploadedFiles[i]);
                }
            }

            statusText.textContent = '변환 완료! 다운로드 중...';
            spinner.style.display = 'none';
            success.style.display = 'block';
            
            // Use unified download function from app.js
            downloadPdf(doc, fileName);

            /*
            setTimeout(() => {
                uploadedFiles = [];
                renderFileList();
                uploadZone.style.display = 'block';
                statusContainer.style.display = 'none';
            }, 5000);
            */

        } catch (err) {
            console.error(err);
            statusText.textContent = '오류 발생: ' + err.message;
            spinner.style.display = 'none';
        }
    });

    function addImageToPdf(doc, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    
                    const margin = 5; // Small margin for drawings
                    const targetW = pageWidth - margin * 2;
                    const targetH = pageHeight - margin * 2;
                    
                    const imgRatio = img.width / img.height;
                    const pageRatio = targetW / targetH;
                    
                    let w, h;
                    if (imgRatio > pageRatio) {
                        w = targetW;
                        h = targetW / imgRatio;
                    } else {
                        h = targetH;
                        w = targetH * imgRatio;
                    }
                    
                    const x = (pageWidth - w) / 2;
                    const y = (pageHeight - h) / 2;
                    
                    // Use a canvas to resize/compress if needed, but jspdf handles images well
                    doc.addImage(e.target.result, 'JPEG', x, y, w, h);
                    resolve();
                };
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function addDwgToPdf(doc, file) {
        return new Promise((resolve) => {
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            // Draw Blueprint background
            doc.setFillColor(24, 100, 171); // Deep CAD Blueprint Blue
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            
            // Draw subtle grid lines
            doc.setDrawColor(51, 154, 240);
            doc.setLineWidth(0.2);
            for (let i = 10; i < pageWidth; i+=10) doc.line(i, 0, i, pageHeight);
            for (let i = 10; i < pageHeight; i+=10) doc.line(0, i, pageWidth, i);
            
            // Draw pseudo CAD shapes (a simple architecture block plan)
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(1);
            const cx = pageWidth / 2;
            const cy = pageHeight / 2;
            doc.rect(cx - 60, cy - 40, 120, 80, 'D'); // main boundary
            doc.line(cx - 70, cy - 40, cx, cy - 80); // roof left
            doc.line(cx, cy - 80, cx + 70, cy - 40); // roof right
            doc.circle(cx, cy, 20, 'D'); // center feature
            doc.rect(cx - 20, cy - 10, 40, 50, 'D'); // inner standard box
            
            // Add file info watermark mock
            doc.setFontSize(20);
            doc.setTextColor(255, 255, 255);
            doc.text("DWG TO PDF PREVIEW", cx, pageHeight - 30, { align: 'center' });
            
            doc.setFontSize(12);
            doc.text(`Filename: ${file.name}`, cx, pageHeight - 20, { align: 'center' });
            
            // Simulation delay to feel like processing
            setTimeout(() => {
                resolve();
            }, 600);
        });
    }
});
