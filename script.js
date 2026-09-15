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
    // Mobile Menu Toggle
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

    // Smooth scrolling for sidebar links with offset
    document.querySelectorAll('aside a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Copy Code Functionality
    document.querySelectorAll('.copy-btn').forEach(copyButton => {
        copyButton.addEventListener('click', async () => {
            const codeBlock = copyButton.closest('.code-block');
            const codeText = codeBlock?.querySelector('pre')?.innerText || '';
            const originalText = copyButton.innerHTML;

            const showCopied = () => {
                copyButton.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                copyButton.classList.add('text-green-400');
                copyButton.style.background = 'rgba(255,255,255,0.2)';

                window.setTimeout(() => {
                    copyButton.innerHTML = originalText;
                    copyButton.classList.remove('text-green-400');
                    copyButton.style.background = '';
                }, 2000);
            };

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

                    const copied = document.execCommand('copy');
                    document.body.removeChild(textArea);

                    if (!copied) {
                        throw new Error('Clipboard copy was rejected.');
                    }
                }

                showCopied();
            } catch (error) {
                console.error('Unable to copy code:', error);
            }
        });
    });

    // Code Editor Simulation
    const runButton = document.getElementById('run-btn');
    const consoleOutput = document.getElementById('console-output');
    const codeEditor = document.getElementById('code-editor');

    if (runButton && consoleOutput && codeEditor) {
        runButton.addEventListener('click', () => {
            const code = codeEditor.value;

            consoleOutput.innerHTML =
                '<span class="text-yellow-400">$ g++ main.cpp -o main -std=c++17</span>\n' +
                '<span class="text-slate-400">Compiling...</span>';

            runButton.disabled = true;
            runButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 빌드 중...';
            runButton.classList.replace('bg-green-600', 'bg-slate-600');
            runButton.classList.replace('hover:bg-green-500', 'hover:bg-slate-600');

            // Educational mock parser: this UI is intentionally a simulation, not a real C++ compiler.
            window.setTimeout(() => {
                runButton.disabled = false;
                runButton.innerHTML = '<i class="fa-solid fa-play"></i> 컴파일 & 실행';
                runButton.classList.replace('bg-slate-600', 'bg-green-600');
                runButton.classList.replace('hover:bg-slate-600', 'hover:bg-green-500');

                if (code.includes('C++ 마스터 클래스에 오신 것을 환영합니다!') && code.includes('vector<int> scores')) {
                    consoleOutput.innerHTML +=
                        '\n<span class="text-yellow-400">$ ./main</span>\n' +
                        'C++ 마스터 클래스에 오신 것을 환영합니다!\n' +
                        '------------------------------------\n' +
                        '학생 수: 5명\n총점: 442점\n평균: 88.4점\n\n' +
                        '<span class="text-slate-500">Program exited with code 0</span>';
                } else if (code.includes('cout')) {
                    let output = '\n<span class="text-yellow-400">$ ./main</span>\n';
                    const coutMatches = code.match(/cout\s*<<\s*"([^"]+)"/g);

                    if (coutMatches) {
                        coutMatches.forEach(match => {
                            const result = match.match(/"([^"]+)"/);
                            if (result) {
                                output += result[1] + '\n';
                            }
                        });
                    } else {
                        output += '[시뮬레이터 안내] 코드가 성공적으로 빌드되었습니다. (동적 결과물 시뮬레이션 제한)\n';
                    }

                    output += '\n<span class="text-slate-500">Program exited with code 0</span>';
                    consoleOutput.innerHTML += output;
                } else {
                    consoleOutput.innerHTML +=
                        '\n<span class="text-yellow-400">$ ./main</span>\n' +
                        '[빌드 성공] 출력할 내용이 없거나 시뮬레이터가 인식하지 못했습니다.\n\n' +
                        '<span class="text-slate-500">Program exited with code 0</span>';
                }

                consoleOutput.scrollTop = consoleOutput.scrollHeight;
            }, 1500);
        });

        // Simple auto-indentation for textarea
        codeEditor.addEventListener('keydown', event => {
            if (event.key !== 'Tab') {
                return;
            }

            event.preventDefault();

            const start = codeEditor.selectionStart;
            const end = codeEditor.selectionEnd;
            codeEditor.value =
                codeEditor.value.substring(0, start) +
                '    ' +
                codeEditor.value.substring(end);

            codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
        });
    }
});
