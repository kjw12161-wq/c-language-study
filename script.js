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

    // 실제 C++17 컴파일/실행: Wandbox의 격리된 원격 컴파일러를 사용합니다.
    const runButton = document.getElementById('run-btn');
    const consoleOutput = document.getElementById('console-output');
    const codeEditor = document.getElementById('code-editor');
    const stdinEditor = document.getElementById('stdin-editor');
    const terminalForm = document.getElementById('terminal-form');
    const terminalInput = document.getElementById('terminal-input');
    const clearConsoleButton = document.getElementById('clear-console-btn');
    const compilerEndpoint = 'https://wandbox.org/api/compile.json';
    const prompt = 'C:\\CPlusPlus>';

    const escapeHtml = value => String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const setConsoleHtml = html => {
        consoleOutput.innerHTML = html;
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };

    const appendConsole = (text, className = '') => {
        const line = document.createElement('div');
        line.className = className;
        line.textContent = text;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };

    const setRunState = running => {
        runButton.disabled = running;
        runButton.innerHTML = running
            ? '<i class="fa-solid fa-spinner fa-spin"></i> 컴파일 중...'
            : '<i class="fa-solid fa-play"></i> 컴파일 & 실행';
        runButton.classList.toggle('bg-slate-600', running);
        runButton.classList.toggle('bg-green-600', !running);
        runButton.classList.toggle('hover:bg-slate-600', running);
        runButton.classList.toggle('hover:bg-green-500', !running);
    };

    const runCpp = async () => {
        if (!runButton || !consoleOutput || !codeEditor) return;

        const code = codeEditor.value.trim();
        const stdin = stdinEditor?.value || '';

        if (!code) {
            setConsoleHtml('<span class="text-red-400">C:\\CPlusPlus&gt; g++ main.cpp -o main -std=c++17</span>\n<span class="text-red-400">error: main.cpp가 비어 있습니다.</span>');
            return;
        }

        setRunState(true);
        setConsoleHtml(
            '<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>\n' +
            '<span class="text-green-400">C:\\CPlusPlus&gt; g++ main.cpp -o main -std=c++17</span>\n' +
            '<span class="text-yellow-400">Compiling...</span>'
        );

        try {
            const response = await fetch(compilerEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    compiler: 'gcc-head',
                    code,
                    stdin,
                    'compiler-option-raw': '-std=c++17'
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();
            const compilerMessage = result.compiler_message || '';
            const programMessage = result.program_message || '';
            const status = result.status;
            const signal = result.signal;

            let html = '<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>\n';
            html += '<span class="text-green-400">C:\\CPlusPlus&gt; g++ main.cpp -o main -std=c++17</span>\n';

            if (compilerMessage) {
                html += '<span class="text-red-400">' + escapeHtml(compilerMessage) + '</span>\n';
            }
            if (programMessage) {
                html += '<span class="text-green-400">' + escapeHtml(programMessage) + '</span>\n';
            }

            if (status !== undefined && status !== null) {
                html += '\n<span class="text-slate-500">Program exited with code ' + escapeHtml(String(status));
                if (signal) html += ' (signal: ' + escapeHtml(String(signal)) + ')';
                html += '</span>';
            }

            setConsoleHtml(html || '<span class="text-slate-400">[실행 결과 없음]</span>');
        } catch (error) {
            setConsoleHtml(
                '<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>\n' +
                '<span class="text-green-400">C:\\CPlusPlus&gt; g++ main.cpp -o main -std=c++17</span>\n' +
                '<span class="text-red-400">원격 컴파일러에 연결하지 못했습니다: ' + escapeHtml(error.message) + '</span>\n' +
                '<span class="text-slate-500">인터넷 연결 또는 Wandbox API 상태를 확인하세요.</span>'
            );
        } finally {
            setRunState(false);
            terminalInput?.focus();
        }
    };

    const executeTerminalCommand = command => {
        const normalized = command.trim().toLowerCase();
        if (!normalized) return;

        appendConsole(`${prompt} ${command}`, 'text-green-400');

        if (normalized === 'cls' || normalized === 'clear') {
            setConsoleHtml('<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>');
            return;
        }

        if (normalized === 'help') {
            appendConsole('사용 가능한 명령어:', 'text-slate-300');
            appendConsole('  run                         현재 main.cpp를 실제 C++17로 컴파일하고 실행');
            appendConsole('  g++ main.cpp -o main         현재 파일을 컴파일');
            appendConsole('  main                        컴파일 후 프로그램 실행');
            appendConsole('  cls / clear                 CMD 화면 지우기');
            appendConsole('  echo [문장]                 문장 출력');
            appendConsole('  help                        명령어 목록');
            return;
        }

        if (normalized === 'run' || normalized === 'main' ||
            normalized === 'g++ main.cpp -o main' ||
            normalized === 'g++ main.cpp -o main -std=c++17') {
            runCpp();
            return;
        }

        if (normalized.startsWith('echo ')) {
            appendConsole(command.slice(5));
            return;
        }

        appendConsole(`'${command}'은(는) 이 교육용 CMD에서 인식되지 않는 명령입니다.`, 'text-red-400');
        appendConsole('help를 입력하면 사용할 수 있는 명령을 확인할 수 있습니다.', 'text-slate-500');
    };

    if (runButton) runButton.addEventListener('click', runCpp);

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
});
