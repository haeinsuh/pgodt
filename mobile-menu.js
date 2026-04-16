// mobile-menu.js - 모바일 햄버거 메뉴 (JS 방식)

(function() {
  function initMobileMenu() {
    var header = document.querySelector('header');
    if (!header) return;

    // 기존 체크박스/레이블 방식 제거 (혹시 남아있을 경우)
    var oldCheck = document.getElementById('mobile-menu-check');
    if (oldCheck) oldCheck.remove();
    var oldLabel = document.querySelector('.mobile-toggle');
    if (oldLabel) oldLabel.remove();

    // 햄버거 버튼 생성
    var btn = document.createElement('button');
    btn.id = 'hamburger-btn';
    btn.setAttribute('aria-label', '메뉴 열기');
    btn.innerHTML = '<span></span><span></span><span></span>';

    var nav = document.querySelector('.nav-links');
    var headerInner = document.querySelector('.header-inner');
    if (headerInner && nav) {
      headerInner.insertBefore(btn, nav);
    }

    // 어두운 오버레이 생성
    var overlay = document.createElement('div');
    overlay.id = 'nav-overlay';
    document.body.appendChild(overlay);

    var isOpen = false;

    function openMenu() {
      isOpen = true;
      btn.classList.add('open');
      btn.setAttribute('aria-label', '메뉴 닫기');
      if (nav) nav.classList.add('open');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      isOpen = false;
      btn.classList.remove('open');
      btn.setAttribute('aria-label', '메뉴 열기');
      if (nav) nav.classList.remove('open');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (isOpen) closeMenu(); else openMenu();
    });

    overlay.addEventListener('click', closeMenu);

    // 모바일에서 드롭다운: hover 대신 tap 토글
    if (nav) {
      var dropdowns = nav.querySelectorAll('.dropdown');
      dropdowns.forEach(function(dd) {
        var trigger = dd.querySelector('.dropbtn');
        if (!trigger) return;
        
        var content = dd.querySelector('.dropdown-content');
        
        trigger.addEventListener('click', function(e) {
          // 모바일 화면에서만
          if (window.innerWidth > 1024) return;
          
          if (content) {
            // 하위 메뉴가 있을 때만 토글 (링크 이동 방지)
            e.preventDefault();
            e.stopPropagation();
            var isActive = dd.classList.contains('active');
            // 다른 열려있는 드롭다운 닫기
            dropdowns.forEach(function(other) {
              if (other !== dd) other.classList.remove('active');
            });
            if (isActive) {
              dd.classList.remove('active');
            } else {
              dd.classList.add('active');
            }
          }
          // 하위 메뉴가 없으면 기본 링크 이동 허용
        });
      });

      // 하위메뉴 링크나 단순 링크 클릭 시에만 메뉴 닫기 (드롭다운 트리거 버튼 제외)
      nav.querySelectorAll('.dropdown-content a, .nav-links > a:not(.dropbtn)').forEach(function(a) {
        a.addEventListener('click', function() {
          closeMenu();
        });
      });
    }

    // 화면 크기 변경 시
    window.addEventListener('resize', function() {
      if (window.innerWidth > 1024) {
        closeMenu();
        if (nav) {
          nav.querySelectorAll('.dropdown').forEach(function(dd) {
            dd.classList.remove('active');
          });
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
  } else {
    initMobileMenu();
  }
})();
