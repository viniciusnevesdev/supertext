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


## Comparação com OCR do iPhone

A interface também aceita o texto produzido pela ação nativa “Extrair Texto da Imagem” do Atalhos.

1. rode o OCR do Supertexto;
2. toque em **Enviar ao Atalho** e escolha **Supertexto — OCR Apple**;
3. o atalho extrai o texto localmente no iPhone, codifica o texto para URL e reabre o Supertexto;
4. o PWA recebe esse texto automaticamente pelo fragmento `#apple=` da URL, remove o fragmento da barra de endereço e inicia a comparação;
5. **Colar manualmente** fica disponível apenas como fallback se o retorno automático falhar.

O último resultado do Supertexto é guardado localmente por até 24 horas para sobreviver ao retorno do Atalhos.


### Privacidade do retorno automático

O texto do OCR do iPhone é enviado ao PWA no **fragmento da URL** (a parte depois de `#`). Fragmentos não são enviados ao servidor HTTP do GitHub Pages. Assim que o PWA lê o texto, ele remove o fragmento da URL com `history.replaceState`.
