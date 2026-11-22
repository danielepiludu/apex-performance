"""Unisce i sorgenti in un solo file: dist/index.html (si apre anche con doppio clic)."""
import os
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, 'src')
JS = ['util.js', 'progress.js', 'quick.js', 'program.js', 'images.js', 'app.js', 'programs.js', 'workout.js', 'print.js', 'demo.js']
t = open(os.path.join(src, 'shell.html'), encoding='utf-8').read()
t = t.replace('/*__CSS__*/', open(os.path.join(src, 'style.css'), encoding='utf-8').read())
t = t.replace('/*__JS__*/', '\n'.join(open(os.path.join(src, f), encoding='utf-8').read() for f in JS))
os.makedirs(os.path.join(here, 'dist'), exist_ok=True)
open(os.path.join(here, 'dist', 'index.html'), 'w', encoding='utf-8').write(t)
print('dist/index.html', len(t), 'byte')
