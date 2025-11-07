'use client';

import { useEffect, useRef } from 'react';

interface TerminalProps {
  onCommand: (command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  className?: string;
}

export function Terminal({ onCommand, className = '' }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const currentLineRef = useRef<string>('');

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return; // Prevent double init

    // Dynamically import xterm to avoid SSR issues
    let cleanup: (() => void) | undefined;

    (async () => {
      const { Terminal: XTerm } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      await import('@xterm/xterm/css/xterm.css');

      if (!terminalRef.current || xtermRef.current) return; // Prevent double init

      // Initialize terminal
      const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0a0a0a',
        foreground: '#f0f0f0',
        cursor: '#00ff00',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#f8f8f2',
        brightBlack: '#4d4d4d',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff',
      },
        rows: 20,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // Welcome message
      term.writeln('Welcome to your VM terminal!');
      term.writeln('Type your commands and press Enter to execute.');
      term.writeln('');
      term.write('$ ');

      // Handle input
      term.onData((data) => {
        const code = data.charCodeAt(0);

        // Handle Enter key
        if (code === 13) {
          const command = currentLineRef.current.trim();
          term.writeln('');
          currentLineRef.current = '';

          if (command) {
            // Execute command
            onCommand(command).then((result) => {
              // Handle stdout
              if (result.stdout) {
                const lines = result.stdout.split('\n');
                lines.forEach((line, i) => {
                  if (i < lines.length - 1) {
                    term.writeln(line);
                  } else if (line) {
                    term.write(line);
                  }
                });
                if (!result.stdout.endsWith('\n') && result.stdout.length > 0) {
                  term.writeln('');
                }
              }

              // Handle stderr in red
              if (result.stderr) {
                const lines = result.stderr.split('\n');
                lines.forEach((line, i) => {
                  if (i < lines.length - 1) {
                    term.writeln('\x1b[31m' + line + '\x1b[0m');
                  } else if (line) {
                    term.writeln('\x1b[31m' + line + '\x1b[0m');
                  }
                });
              }

              term.write('$ ');
            }).catch((error) => {
              term.writeln('\x1b[31m' + (error.message || 'Command failed') + '\x1b[0m');
              term.write('$ ');
            });
          } else {
            term.write('$ ');
          }
          return;
        }

        // Handle Backspace
        if (code === 127) {
          if (currentLineRef.current.length > 0) {
            currentLineRef.current = currentLineRef.current.slice(0, -1);
            term.write('\b \b');
          }
          return;
        }

        // Handle Ctrl+C
        if (code === 3) {
          term.writeln('^C');
          currentLineRef.current = '';
          term.write('$ ');
          return;
        }

        // Regular character input
        if (code >= 32 && code <= 126) {
          currentLineRef.current += data;
          term.write(data);
        }
      });

      // Handle resize
      const handleResize = () => {
        fitAddon.fit();
      };
      window.addEventListener('resize', handleResize);

      cleanup = () => {
        window.removeEventListener('resize', handleResize);
        term.dispose();
      };
    })();

    return () => {
      cleanup?.();
    };
  }, [onCommand]);

  return <div ref={terminalRef} className={className} />;
}
