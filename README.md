# Aycromo - Laboratório de Análise Cromossômica 🧬

Bem-vindo ao repositório oficial do Aycromo, um aplicativo desktop focado na detecção e curadoria de cromossomos através de modelos avançados de Inteligência Artificial (YOLO/PyTorch).

## 📥 Download da Última Versão

O aplicativo está disponível oficialmente para **Windows**. As versões são geradas automaticamente na nuvem para garantir a máxima segurança e integridade.

| Plataforma | Status do Lançamento | Link para Download |
| --- | --- | --- |
| **🪟 Windows** | ✅ Disponível | [Baixar para Windows (EXE)](https://github.com/jorgelucasalima/aycromo-electron-front/releases/tag/latest) |

> 💡 **Como baixar?**  
> Clique no link acima. Você será direcionado para a página da **Última Versão**. Desça até o final da página (na seção **Assets**) e clique no arquivo instalador correspondente (ex: `.exe` para Windows).

---

## 🛠️ Para Desenvolvedores

Se você deseja rodar o projeto localmente:

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/jorgelucasalima/aycromo-electron-front.git
   cd aycromo-electron-front
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o ambiente de desenvolvimento:**
   ```bash
   npm start
   ```

### 📦 Compilação Local
Caso precise gerar os instaladores na sua própria máquina (apenas recomendado para a plataforma em que você está operando atualmente):
```bash
npm run make:mac   # Compila instalador para macOS
npm run make:win   # Compila instalador para Windows (requer wine e mono se for executado no Mac)
npm run make:linux # Compila pacote .deb para distribuições baseadas no Debian/Ubuntu
```
