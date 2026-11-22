t=open('shell.html').read()
t=t.replace('/*__CSS__*/',open('style.css').read()).replace('/*__JS__*/',open('app.js').read())
open('index.html','w').write(t);print(len(t))
