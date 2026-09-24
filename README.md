# Supertexto

PWA de OCR local focado em confiança, não apenas em retornar um texto único.

## O que esta versão faz

- aceita foto da biblioteca ou câmera;
- roda OCR no navegador com Tesseract.js/WebAssembly;
- faz 3 leituras por padrão: original, contraste e binarização;
- o modo Precisão extra adiciona uma quarta leitura;
- cruza palavras pela posição na imagem e calcula consenso;
- marca caixas em verde, amarelo ou vermelho conforme a confiança;
- mostra alternativas quando as leituras discordam;
- permite vocabulário opcional e inclui um vocabulário INCI básico no modo de ingredientes;
- instala como PWA e mantém o shell do app em cache;
- não usa API paga por imagem.

## Privacidade

O reconhecimento é executado localmente. No primeiro uso o navegador baixa o JavaScript do Tesseract, o WebAssembly e os arquivos de idioma. O service worker tenta manter esses recursos em cache para usos seguintes.

## Limite importante

Esta primeira versão não promete ser universalmente mais precisa que o Live Text da Apple. A vantagem é repetir o reconhecimento, comparar resultados e sinalizar incerteza em vez de apresentar todo o texto com a mesma aparência de certeza.

É um site estático e pode ser servido por GitHub Pages, Vercel ou outra hospedagem HTTPS.
