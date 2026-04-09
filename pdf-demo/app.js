document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.tool-section');
    const currentToolTitle = document.getElementById('current-tool-title');

    console.log('Hub initialized. Navigation items:', navItems.length, 'Sections:', sections.length);

    function switchSection(targetId, item) {
        console.log('Switching to section:', targetId);
        
        // Update active state in sidebar
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Update top bar title
        const targetTitle = item.querySelector('span').textContent;
        const iconEl = item.querySelector('i');
        
        if (currentToolTitle && iconEl) {
            currentToolTitle.innerHTML = '';
            currentToolTitle.appendChild(iconEl.cloneNode(true));
            currentToolTitle.insertAdjacentText('beforeend', ' ' + targetTitle);
        }

        // Show target section, hide others
        let matchFound = false;
        sections.forEach(section => {
            if (section.id === targetId) {
                section.style.display = 'flex';
                section.classList.add('active');
                matchFound = true;
            } else {
                section.style.display = 'none';
                section.classList.remove('active');
            }
        });

        if (!matchFound) {
            console.error('No section found with ID:', targetId);
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            switchSection(targetId, item);
        });
    });

    // Initialize specific tool from URL or default to first
    const urlParams = new URLSearchParams(window.location.search);
    const requestedTool = urlParams.get('tool');
    let targetItem = null;

    if (requestedTool) {
        targetItem = Array.from(navItems).find(item => item.getAttribute('data-target') === requestedTool);
    }
    
    if (!targetItem && navItems.length > 0) {
        targetItem = navItems[0];
    }

    if (targetItem) {
        switchSection(targetItem.getAttribute('data-target'), targetItem);
    }
});

/**
 * Unified robust PDF download function
 * @param {jsPDF} doc - The jsPDF instance
 * @param {string} fileName - The desired filename
 */
async function downloadPdf(doc, fileName) {
    // 1. Sanitize
    if (!fileName) fileName = 'converted_document';
    if (!fileName.toLowerCase().endsWith('.pdf')) fileName += '.pdf';
    
    // 2. Prepare Data
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    
    // Store globally for button access
    window._lastPdfDoc = doc;
    window._lastPdfName = fileName;
    window._lastPdfBlobUrl = blobUrl;
    
    console.log(`[PDF Hub] Initializing File System Save for: ${fileName}`);

    // Helper to inject the success/fallback UI
    const injectUI = (isSaved = false) => {
        const sections = document.querySelectorAll('.tool-section.active');
        let targetEl = null;
        
        sections.forEach(s => {
            const status = s.querySelector('#status-text, #drawing-status-text, .conversion-status');
            if (status && status.offsetParent !== null) targetEl = status;
        });

        if (targetEl) {
            if (isSaved) {
                targetEl.innerHTML = `
                    <div style="margin-top:20px; text-align:center; padding:30px; background:white; border-radius:15px; box-shadow:0 20px 40px rgba(0,0,0,0.1); border:2px solid #51cf66; max-width:450px; margin-left:auto; margin-right:auto;">
                        <div style="color:#51cf66; font-size:3.5rem; margin-bottom:15px;"><i class='bx bxs-check-circle'></i></div>
                        <h2 style="margin-bottom:8px; color:#333; font-size:1.5rem;">저장 성공!</h2>
                        <p style="margin-bottom:25px; color:#666; font-size:1rem;"><strong>${fileName}</strong> 파일이 내 PC에 정상적으로 저장되었습니다.</p>
                        <button onclick="window.location.reload()" style="padding:16px 30px; background:#51cf66; color:white; border:none; border-radius:10px; font-weight:bold; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 12px rgba(81, 207, 102, 0.3);">
                            새로운 파일 변환하기
                        </button>
                    </div>
                `;
            } else {
                targetEl.innerHTML = `
                    <div style="margin-top:20px; text-align:center; padding:30px; background:white; border-radius:15px; box-shadow:0 20px 40px rgba(0,0,0,0.1); border:2px solid #228be6; max-width:450px; margin-left:auto; margin-right:auto;">
                        <div style="color:#228be6; font-size:3.5rem; margin-bottom:15px;"><i class='bx bxs-file-pdf'></i></div>
                        <h2 style="margin-bottom:8px; color:#333; font-size:1.5rem;">변환 완료!</h2>
                        <p style="margin-bottom:25px; color:#666; font-size:1rem;">파일명: <strong>${fileName}</strong></p>
                        
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            <button onclick="downloadPdf(window._lastPdfDoc, window._lastPdfName)" 
                                    style="padding:16px; background:#228be6; color:white; border:none; border-radius:10px; font-weight:bold; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 12px rgba(34, 139, 230, 0.3);">
                                <i class='bx bx-save'></i> 파일 바로 저장하기
                            </button>
                            <button onclick="window.open(window._lastPdfBlobUrl, '_blank')" 
                                    style="padding:14px; background:#f1f3f5; color:#228be6; border:2px solid #228be6; border-radius:10px; font-weight:bold; font-size:1rem; cursor:pointer;">
                                <i class='bx bx-show'></i> 새 탭에서 읽기 (미리보기)
                            </button>
                        </div>

                        <div style="margin-top:20px; padding-top:15px; border-top:1px solid #eee;">
                            <button onclick="window.location.reload()" style="background:none; border:none; color:#adb5bd; cursor:pointer; font-size:0.9rem; text-decoration:underline;">
                                다른 파일 변환하기
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    };

    // 3. Try Native File System Saver (Solves "UUID" / no extension bug permanently)
    try {
        if (window.showSaveFilePicker) {
            console.log('[PDF Hub] Prompting File System Save...');
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'PDF Document',
                    accept: { 'application/pdf': ['.pdf'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            console.log('[PDF Hub] Saved directly via File System API');
            injectUI(true); // Show success checkmark
            return;
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('[PDF Hub] User cancelled the save dialog');
            injectUI(false);
            return;
        }
        console.warn('[PDF Hub] showSaveFilePicker failed (gesture required or not supported):', err);
    }

    // 4. Fallback if Native Save unavailable or blocked by lack of user gesture
    injectUI(false);
    
    // Auto-download attempt as a last resort
    try {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) {
        console.warn('Auto download fallback failed');
    }
}

