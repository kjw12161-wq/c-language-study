window.tailwind = window.tailwind || {};
window.tailwind.config = {
    theme: {
        extend: {
            colors: {
                cpp: {
                    blue: '#00599C',
                    dark: '#004482',
                    light: '#659ad2'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['Fira Code', 'monospace']
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            const isOpen = !mobileMenu.classList.contains('hidden');
            menuButton.setAttribute('aria-expanded', String(isOpen));
        });

        mobileMenu.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                menuButton.setAttribute('aria-expanded', 'false');
            });
        });
    }

    document.querySelectorAll('aside a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (event) {
            event.preventDefault();
            const targetElement = document.querySelector(this.getAttribute('href'));
            if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
        });
    });

    document.querySelectorAll('.copy-btn').forEach(copyButton => {
        copyButton.addEventListener('click', async () => {
            const codeBlock = copyButton.closest('.code-block');
            const codeText = codeBlock?.querySelector('pre')?.innerText || '';
            const originalText = copyButton.innerHTML;

            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(codeText);
                } else {
                    const textArea = document.createElement('textarea');
                    textArea.value = codeText;
                    textArea.setAttribute('readonly', '');
                    textArea.style.position = 'fixed';
                    textArea.style.opacity = '0';
                    document.body.appendChild(textArea);
                    textArea.select();
                    if (!document.execCommand('copy')) throw new Error('Clipboard copy was rejected.');
                    document.body.removeChild(textArea);
                }

                copyButton.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                copyButton.classList.add('text-green-400');
                copyButton.style.background = 'rgba(255,255,255,0.2)';
                window.setTimeout(() => {
                    copyButton.innerHTML = originalText;
                    copyButton.classList.remove('text-green-400');
                    copyButton.style.background = '';
                }, 2000);
            } catch (error) {
                console.error('Unable to copy code:', error);
            }
        });
    });

    const runButton = document.getElementById('run-btn');
    const consoleOutput = document.getElementById('console-output');
    const codeEditor = document.getElementById('code-editor');
    const stdinEditor = document.getElementById('stdin-editor');
    const terminalForm = document.getElementById('terminal-form');
    const terminalInput = document.getElementById('terminal-input');
    const clearConsoleButton = document.getElementById('clear-console-btn');

    const prompt = 'C:\\CPlusPlus>';
    const JSCPP_SOURCES = [
        'https://cdn.jsdelivr.net/npm/JSCPP@2.0.9/dist/JSCPP.es5.min.js',
        'https://raw.githubusercontent.com/felixhao28/JSCPP/gh-pages/dist/JSCPP.es5.min.js'
    ];
    let enginePromise = null;

    const setConsoleHtml = html => {
        if (!consoleOutput) return;
        consoleOutput.innerHTML = html;
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };

    const appendConsole = (text, className = '') => {
        if (!consoleOutput) return;
        const line = document.createElement('div');
        line.className = className;
        line.textContent = text;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };

    const escapeHtml = value => String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const setRunState = running => {
        if (!runButton) return;
        runButton.disabled = running;
        runButton.innerHTML = running
            ? '<i class="fa-solid fa-spinner fa-spin"></i> 실행 중...'
            : '<i class="fa-solid fa-play"></i> 컴파일 & 실행';
        runButton.classList.toggle('bg-slate-600', running);
        runButton.classList.toggle('bg-green-600', !running);
        runButton.classList.toggle('hover:bg-slate-600', running);
        runButton.classList.toggle('hover:bg-green-500', !running);
    };

    const loadScript = src => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`엔진 파일 로드 실패: ${src}`));
        document.head.appendChild(script);
    });

    const loadCppEngine = async () => {
        if (window.JSCPP && typeof window.JSCPP.run === 'function') return window.JSCPP;
        if (enginePromise) return enginePromise;

        enginePromise = (async () => {
            let lastError = null;

            for (const source of JSCPP_SOURCES) {
                try {
                    await loadScript(source);
                    if (window.JSCPP && typeof window.JSCPP.run === 'function') {
                        return window.JSCPP;
                    }
                } catch (error) {
                    lastError = error;
                }
            }

            throw lastError || new Error('JSCPP 실행 엔진을 찾을 수 없습니다.');
        })();

        try {
            return await Promise.race([
                enginePromise,
                new Promise((_, reject) => window.setTimeout(() => reject(new Error('브라우저 C++ 실행 엔진 로드 시간이 초과되었습니다.')), 15000))
            ]);
        } catch (error) {
            enginePromise = null;
            throw error;
        }
    };

    const showEngineLoading = () => {
        setConsoleHtml(
            '<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>\n' +
            '<span class="text-green-400">' + escapeHtml(prompt) + ' g++ main.cpp -o main -std=c++17</span>\n' +
            '<span class="text-yellow-400">브라우저 C++ 실행 엔진을 불러오는 중...</span>'
        );
    };

    const runCppLocally = async () => {
        if (!runButton || !consoleOutput || !codeEditor) return;

        const code = codeEditor.value.trim();
        const stdin = stdinEditor?.value || '';

        if (!code) {
            setConsoleHtml(
                '<span class="text-red-400">' + escapeHtml(prompt) + ' g++ main.cpp -o main -std=c++17</span>\n' +
                '<span class="text-red-400">error: main.cpp가 비어 있습니다.</span>'
            );
            return;
        }

        setRunState(true);
        showEngineLoading();

        try {
            const JSCPP = await loadCppEngine();
            let output = '';

            setConsoleHtml(
                '<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>\n' +
                '<span class="text-green-400">' + escapeHtml(prompt) + ' g++ main.cpp -o main -std=c++17</span>\n' +
                '<span class="text-yellow-400">브라우저 내부 C++ 실행 중...</span>'
            );

            const exitCode = JSCPP.run(code, stdin, {
                stdio: {
                    write: text => {
                        output += String(text);
                    }
                }
            });

            let html = '<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>\n';
            html += '<span class="text-green-400">' + escapeHtml(prompt) + ' g++ main.cpp -o main -std=c++17</span>\n';
            html += '<span class="text-slate-500">[browser C++ runtime / JSCPP]</span>\n';

            if (output) {
                html += '<span class="text-green-400">' + escapeHtml(output) + '</span>\n';
            } else {
                html += '<span class="text-slate-400">[출력 없음]</span>\n';
            }

            if (exitCode !== undefined && exitCode !== null) {
                html += '\n<span class="text-slate-500">Program exited with code ' + escapeHtml(String(exitCode)) + '</span>';
            }

            setConsoleHtml(html);
        } catch (error) {
            setConsoleHtml(
                '<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>\n' +
                '<span class="text-green-400">' + escapeHtml(prompt) + ' g++ main.cpp -o main -std=c++17</span>\n' +
                '<span class="text-red-400">브라우저 C++ 실행 오류: ' + escapeHtml(error?.message || String(error)) + '</span>\n' +
                '<span class="text-slate-500">JSCPP를 불러올 수 없으면 인터넷 연결 또는 CDN 접근을 확인해 주세요.</span>'
            );
        } finally {
            setRunState(false);
            terminalInput?.focus();
        }
    };

    const executeTerminalCommand = command => {
        const trimmed = command.trim();
        if (!trimmed) return;

        const normalized = trimmed.toLowerCase();
        appendConsole(`${prompt} ${trimmed}`, 'text-green-400');

        if (normalized === 'cls' || normalized === 'clear') {
            setConsoleHtml('<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>');
            return;
        }

        if (normalized === 'help') {
            appendConsole('사용 가능한 명령어:', 'text-slate-300');
            appendConsole('  run                         현재 main.cpp 실행');
            appendConsole('  g++ main.cpp -o main        C++ 프로그램 실행');
            appendConsole('  main                        현재 main.cpp 실행');
            appendConsole('  cls / clear                 화면 지우기');
            appendConsole('  echo [문장]                 문장 출력');
            appendConsole('  help                        명령어 목록');
            return;
        }

        if (normalized === 'run' || normalized === 'main' ||
            normalized === 'g++ main.cpp -o main' ||
            normalized === 'g++ main.cpp -o main -std=c++17') {
            runCppLocally();
            return;
        }

        if (normalized.startsWith('echo ')) {
            appendConsole(trimmed.slice(5));
            return;
        }

        appendConsole(`'${trimmed}'은(는) 이 교육용 CMD에서 인식되지 않는 명령입니다.`, 'text-red-400');
        appendConsole('help를 입력하면 사용할 수 있는 명령을 확인할 수 있습니다.', 'text-slate-500');
    };

    if (runButton) runButton.addEventListener('click', runCppLocally);

    if (clearConsoleButton && consoleOutput) {
        clearConsoleButton.addEventListener('click', () => {
            setConsoleHtml('<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>');
            terminalInput?.focus();
        });
    }

    if (terminalForm && terminalInput) {
        terminalForm.addEventListener('submit', event => {
            event.preventDefault();
            const command = terminalInput.value;
            terminalInput.value = '';
            executeTerminalCommand(command);
        });
    }

    if (codeEditor) {
        codeEditor.addEventListener('keydown', event => {
            if (event.key !== 'Tab') return;
            event.preventDefault();

            const start = codeEditor.selectionStart;
            const end = codeEditor.selectionEnd;
            codeEditor.value = codeEditor.value.substring(0, start) + '    ' + codeEditor.value.substring(end);
            codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
        });
    }

    // 백그라운드에서 미리 엔진을 로드합니다. 실패해도 페이지의 나머지 기능은 정상 작동합니다.
    loadCppEngine().catch(() => {});
});
