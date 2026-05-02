import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createGlobalStyle, ThemeProvider } from 'styled-components'
import { styleReset } from 'react95'
import original from 'react95/dist/themes/original'
import ms_sans_serif from 'react95/dist/fonts/ms_sans_serif.woff2'
import ms_sans_serif_bold from 'react95/dist/fonts/ms_sans_serif_bold.woff2'

const GlobalStyles = createGlobalStyle`
    ${styleReset}

    @font-face {
        font-family: 'ms_sans_serif';
        src: url(${ms_sans_serif}) format('woff2');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
    }
    @font-face {
        font-family: 'ms_sans_serif';
        src: url(${ms_sans_serif_bold}) format('woff2');
        font-weight: 700;
        font-style: normal;
        font-display: swap;
    }

    *, *::before, *::after {
        box-sizing: border-box;
    }

    html, body, #root {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
    }

    body {
        font-family: 'ms_sans_serif', sans-serif;
        background: #008080;
        min-height: 100dvh;
    }

    #root {
        display: flex;
        flex-direction: column;
        min-height: 100dvh;
    }
`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={original}>
      <GlobalStyles />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
