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

    // Wandbox public API
    // list.json으로 현재 실제 존재하는 C++ 컴파일러를 조회한 뒤 compile.json에 사용합니다.
    const compilerListEndpoint = 'https://wandbox.org/api/list.json';
    const compilerEndpoint = 'https://wandbox.org/api/compile.json';
    let compilerListPromise = null;
    const prompt = 'C:\\CPlusPlus>';

    const escapeHtml = value => String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

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

    const setRunState = running => {
        if (!runButton) return;
        runButton.disabled = running;
        runButton.innerHTML = running
            ? '<i class="fa-solid fa-spinner fa-spin"></i> 컴파일 중...'
            : '<i class="fa-solid fa-play"></i> 컴파일 & 실행';
        runButton.classList.toggle('bg-slate-600', running);
        runButton.classList.toggle('bg-green-600', !running);
        runButton.classList.toggle('hover:bg-slate-600', running);
        runButton.classList.toggle('hover:bg-green-500', !running);
    };

    const fetchJson = async (url, init = {}) => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 20000);

        try {
            const response = await fetch(url, {
                ...init,
                signal: controller.signal,
                cache: 'no-store'
            });
            const text = await response.text();

            if (!response.ok) {
                let detail = '';
                try {
                    const parsed = JSON.parse(text);
                    detail = parsed.message || parsed.error || parsed.compiler_message || '';
                } catch (_) {
                    detail = text.trim();
                }

                const suffix = detail ? ` — ${detail.slice(0, 300)}` : '';
                throw new Error(`HTTP ${response.status}${suffix}`);
            }

            try {
                return JSON.parse(text);
            } catch (_) {
                throw new Error('Wandbox가 올바른 JSON 응답을 반환하지 않았습니다.');
            }
        } finally {
            window.clearTimeout(timeout);
        }
    };

    const getCppCompiler = async () => {
        if (!compilerListPromise) {
            compilerListPromise = fetchJson(compilerListEndpoint)
                .then(list => {
                    const compilers = Array.isArray(list)
                        ? list.filter(item => String(item?.language || '').toLowerCase() === 'c++' && item?.name)
                        : [];

                    if (!compilers.length) {
                        throw new Error('현재 Wandbox에서 사용할 수 있는 C++ 컴파일러를 찾지 못했습니다.');
                    }

                    // GCC 계열을 우선하고, 없으면 Clang, 그 다음 첫 C++ 컴파일러를 사용합니다.
                    return compilers.find(item => /gcc|g\+\+/i.test(item.name) && /head/i.test(item.name))
                        || compilers.find(item => /gcc|g\+\+/i.test(item.name))
                        || compilers.find(item => /clang/i.test(item.name))
                        || compilers[0];
                })
                .catch(error => {
                    compilerListPromise = null;
                    throw error;
                });
        }

        return compilerListPromise;
    };

    const findCxx17Option = compiler => {
        const switches = Array.isArray(compiler?.switches) ? compiler.switches : [];

        for (const group of switches) {
            const options = Array.isArray(group?.options) ? group.options : [];
            for (const option of options) {
                const text = [
                    option?.name,
                    option?.['display-name'],
                    option?.display_name,
                    option?.['display-flags'],
                    option?.display_flags
                ].filter(Boolean).join(' ');

                if (/c\+\+17|gnu\+\+17/i.test(text)) {
                    return option?.name || null;
                }
            }
        }

        return null;
    };

    const runCpp = async () => {
        if (!runButton || !consoleOutput || !codeEditor) return;

        const code = codeEditor.value.trim();
        const stdin = stdinEditor?.value || '';

        if (!code) {
            setConsoleHtml(
                '<span class="text-red-400">C:\\CPlusPlus&gt; g++ main.cpp -o main -std=c++17</span>\n' +
                '<span class="text-red-400">error: main.cpp가 비어 있습니다.</span>'
            );
            return;
        }

        setRunState(true);
        setConsoleHtml(
            '<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>\n' +
            '<span class="text-green-400">C:\\CPlusPlus&gt; g++ main.cpp -o main -std=c++17</span>\n' +
            '<span class="text-yellow-400">Wandbox 컴파일러 확인 중...</span>'
        );

        try {
            const compiler = await getCppCompiler();
            const payload = {
                compiler: compiler.name,
                code,
                stdin
            };

            // C++17 스위치가 실제 목록에 있을 때만 사용합니다.
            // 지원되지 않는 raw 옵션을 무조건 전송하면 서버가 500을 반환할 수 있습니다.
            const cxx17Option = findCxx17Option(compiler);

            if (cxx17Option) {
                payload.options = cxx17Option;
            } else if (compiler['compiler-option-raw'] === true) {
                payload['compiler-option-raw'] = '-std=c++17';
            }

            setConsoleHtml(
                '<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>\n' +
                '<span class="text-green-400">C:\\CPlusPlus&gt; g++ main.cpp -o main -std=c++17</span>\n' +
                '<span class="text-yellow-400">[' + escapeHtml(compiler.display_name || compiler.name) + '] 컴파일 중...</span>'
            );

            const result = await fetchJson(compilerEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const compilerMessage = result.compiler_message || '';
            const programMessage = result.program_message || '';
            const programOutput = result.program_output || '';
            const status = result.status;
            const signal = result.signal;

            let html = '<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>\n';
            html += '<span class="text-green-400">C:\\CPlusPlus&gt; g++ main.cpp -o main -std=c++17</span>\n';

            if (compilerMessage) {
                html += '<span class="text-red-400">' + escapeHtml(compilerMessage) + '</span>\n';
            }

            const output = programOutput || programMessage;
            if (output) {
                html += '<span class="text-green-400">' + escapeHtml(output) + '</span>\n';
            }

            if (!compilerMessage && !output) {
                html += '<span class="text-slate-400">[출력 없음]</span>\n';
            }

            if (status !== undefined && status !== null) {
                html += '\n<span class="text-slate-500">Program exited with code ' + escapeHtml(String(status));
                if (signal) html += ' (signal: ' + escapeHtml(String(signal)) + ')';
                html += '</span>';
            }

            setConsoleHtml(html);
        } catch (error) {
            const message = error?.name === 'AbortError'
                ? '요청 시간이 초과되었습니다. Wandbox 서버가 응답하지 않습니다.'
                : error?.message || '알 수 없는 오류';

            setConsoleHtml(
                '<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>\n' +
                '<span class="text-green-400">C:\\CPlusPlus&gt; g++ main.cpp -o main -std=c++17</span>\n' +
                '<span class="text-red-400">원격 컴파일러 오류: ' + escapeHtml(message) + '</span>\n' +
                '<span class="text-slate-500">현재 C++ 컴파일러 목록을 다시 조회하도록 수정되어 있습니다. 잠시 후 다시 실행해 주세요.</span>'
            );
        } finally {
            setRunState(false);
        }
    };

    if (runButton) runButton.addEventListener('click', runCpp);

    if (clearConsoleButton && consoleOutput) {
        clearConsoleButton.addEventListener('click', () => {
            setConsoleHtml('<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>');
        });
    }

    if (terminalForm && terminalInput) {
        terminalForm.addEventListener('submit', event => {
            event.preventDefault();
            const command = terminalInput.value.trim();
            terminalInput.value = '';

            if (!command) return;
            const normalized = command.toLowerCase();

            appendConsole(`${prompt} ${command}`, 'text-green-400');

            if (normalized === 'cls' || normalized === 'clear') {
                setConsoleHtml('<span class="text-slate-400">Microsoft Windows [Version 10.0]</span>');
            } else if (normalized === 'help') {
                appendConsole('run / main / g++ main.cpp -o main -std=c++17 : C++ 실행');
                appendConsole('cls / clear : 콘솔 지우기');
                appendConsole('echo [문장] : 문장 출력');
                appendConsole('help : 명령어 목록');
            } else if (normalized === 'run' || normalized === 'main' || normalized === 'g++ main.cpp -o main' || normalized === 'g++ main.cpp -o main -std=c++17') {
                runCpp();
            } else if (normalized.startsWith('echo ')) {
                appendConsole(command.slice(5));
            } else {
                appendConsole(`'${command}'은(는) 이 교육용 CMD에서 인식되지 않는 명령입니다.`, 'text-red-400');
            }
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
