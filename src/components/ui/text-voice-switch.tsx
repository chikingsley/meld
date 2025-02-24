import styled from 'styled-components';
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { useState, useEffect } from 'react';

interface TextVoiceSwitchProps {
  isVoiceMode: boolean;
  onModeChange: (isVoice: boolean) => void;
}

export const TextVoiceSwitch = ({ isVoiceMode, onModeChange }: TextVoiceSwitchProps) => {
  const [waveformAnimating, setWaveformAnimating] = useState(false);
  
  // Get current mode label
  const currentMode = isVoiceMode ? "Voice Mode" : "Text Mode";

  // Start animation when voice mode is active
  useEffect(() => {
    if (isVoiceMode) {
      setWaveformAnimating(true);
    } else {
      setWaveformAnimating(false);
    }
  }, [isVoiceMode]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <StyledWrapper>
          <label className="mode-switch">
            <input 
              type="checkbox" 
              className="mode-switch__checkbox" 
              checked={isVoiceMode}
              onChange={() => onModeChange(!isVoiceMode)}
            />
            <div className="mode-switch__container">
              {/* Mode label display */}
              <div className="mode-switch__label">
                {currentMode}
              </div>
              
              {/* Floating punctuation marks */}
              <div className="mode-switch__punctuation">
                <span className="mode-switch__mark mode-switch__mark--period">.</span>
                <span className="mode-switch__mark mode-switch__mark--question">?</span>
                <span className="mode-switch__mark mode-switch__mark--exclamation">!</span>
                <span className="mode-switch__mark mode-switch__mark--comma">,</span>
              </div>
              
              {/* Waveform that animates when active */}
              <div className="mode-switch__waveform">
                <div className={`mode-switch__bar ${waveformAnimating ? 'animate' : ''}`} style={{ animationDelay: '0s' }}></div>
                <div className={`mode-switch__bar ${waveformAnimating ? 'animate' : ''}`} style={{ animationDelay: '0.2s' }}></div>
                <div className={`mode-switch__bar ${waveformAnimating ? 'animate' : ''}`} style={{ animationDelay: '0.1s' }}></div>
                <div className={`mode-switch__bar ${waveformAnimating ? 'animate' : ''}`} style={{ animationDelay: '0.3s' }}></div>
              </div>
              
              {/* Main circle container that slides */}
              <div className="mode-switch__circle-container">
                <div className="mode-switch__content-container">
                  {/* Text side */}
                  <div className="mode-switch__text">
                    <span className="mode-switch__text-content">Aa</span>
                  </div>
                  
                  {/* Voice side */}
                  <div className="mode-switch__voice">
                    <div className="mode-switch__voice-icon">
                      <div className="mode-switch__voice-wave"></div>
                      <div className="mode-switch__voice-wave"></div>
                      <div className="mode-switch__voice-wave"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </label>
        </StyledWrapper>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  width: 100%;

  .mode-switch {
    --toggle-size: 20px;
    --container-width: 12em; /* Increased width to accommodate text */
    --container-height: 1.5em;
    --container-radius: 6.25em;
    --text-mode-bg: #475569; /* Blue-gray */
    --voice-mode-bg: #8B5CF6; /* Warm purple */
    --circle-container-diameter: calc(var(--container-height) * 1.35);
    --icon-diameter: calc(var(--container-height) * 0.85);
    --text-color: #F8FAFC;
    --highlight-color: #E2E8F0;
    --circle-container-offset: calc((var(--circle-container-diameter) - var(--container-height)) / 2 * -1);
    --transition: .4s cubic-bezier(0, -0.02, 0.4, 1.25);
    --circle-transition: .3s cubic-bezier(0, -0.02, 0.35, 1.17);
  }

  .mode-switch, .mode-switch *, .mode-switch *::before, .mode-switch *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-size: var(--toggle-size);
  }

  .mode-switch__container {
    width: var(--container-width);
    height: var(--container-height);
    background-color: var(--text-mode-bg);
    border-radius: var(--container-radius);
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0em -0.062em 0.062em rgba(0, 0, 0, 0.25), 0em 0.062em 0.125em rgba(255, 255, 255, 0.2);
    transition: var(--transition);
    position: relative;
  }

  .mode-switch__container::before {
    content: "";
    position: absolute;
    z-index: 1;
    inset: 0;
    box-shadow: 0em 0.05em 0.187em rgba(0, 0, 0, 0.25) inset, 0em 0.05em 0.187em rgba(0, 0, 0, 0.25) inset;
    border-radius: var(--container-radius);
  }

  .mode-switch__checkbox {
    display: none;
  }

  /* Text mode elements */
  .mode-switch__punctuation {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 1;
    opacity: 1;
    transition: opacity 0.5s;
  }

  .mode-switch__mark {
    position: absolute;
    color: var(--highlight-color);
    opacity: 0.7;
    font-weight: bold;
    animation: float 3s infinite ease-in-out;
  }

  .mode-switch__mark--period {
    font-size: 1.2em;
    top: 30%;
    left: 15%;
    animation-delay: 0s;
  }

  .mode-switch__mark--question {
    font-size: 1em;
    top: 50%;
    left: 30%;
    animation-delay: 0.4s;
  }

  .mode-switch__mark--exclamation {
    font-size: 1em;
    top: 25%;
    left: 40%;
    animation-delay: 0.8s;
  }

  .mode-switch__mark--comma {
    font-size: 1.2em;
    top: 60%;
    left: 25%;
    animation-delay: 1.2s;
  }

  /* Mode label */
  .mode-switch__label {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
    font-weight: bold;
    font-size: 0.8em;
    letter-spacing: 0.05em;
    z-index: 1;
    transition: var(--transition);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  /* Voice mode elements */
  .mode-switch__waveform {
    position: absolute;
    right: 15%;
    top: 50%;
    transform: translateY(-50%);
    height: 70%;
    display: flex;
    align-items: center;
    gap: 0.15em;
    z-index: 1;
    opacity: 0;
    transition: opacity 0.5s;
  }

  .mode-switch__bar {
    width: 0.25em;
    height: 40%;
    background-color: var(--highlight-color);
    border-radius: 0.125em;
  }

  .mode-switch__bar.animate {
    animation: pulse 1.2s infinite ease-in-out;
  }

  .mode-switch__bar:nth-child(1) { height: 50%; }
  .mode-switch__bar:nth-child(2) { height: 70%; }
  .mode-switch__bar:nth-child(3) { height: 100%; }
  .mode-switch__bar:nth-child(4) { height: 60%; }

  /* Sliding circle */
  .mode-switch__circle-container {
    width: var(--circle-container-diameter);
    height: var(--circle-container-diameter);
    background-color: rgba(255, 255, 255, 0.1);
    position: absolute;
    left: var(--circle-container-offset);
    top: var(--circle-container-offset);
    border-radius: var(--container-radius);
    box-shadow: inset 0 0 0 0.125em rgba(255, 255, 255, 0.1), 0 0 0 0.125em rgba(255, 255, 255, 0.05);
    display: flex;
    transition: var(--circle-transition);
    pointer-events: none;
    z-index: 2;
  }

  .mode-switch__content-container {
    position: relative;
    z-index: 2;
    width: var(--icon-diameter);
    height: var(--icon-diameter);
    margin: auto;
    border-radius: var(--container-radius);
    background-color: #fff;
    box-shadow: 0.062em 0.125em 0.25em rgba(0, 0, 0, 0.2);
    overflow: hidden;
    transition: var(--transition);
  }

  /* Text side styling */
  .mode-switch__text {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.5s ease;
  }

  .mode-switch__text-content {
    font-weight: bold;
    font-size: 0.8em;
    color: var(--text-mode-bg);
    line-height: 1;
  }

  /* Voice side styling */
  .mode-switch__voice {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translateX(100%);
    transition: transform 0.5s ease;
  }

  .mode-switch__voice-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60%;
    height: 60%;
  }

  .mode-switch__voice-wave {
    position: absolute;
    width: 80%;
    height: 80%;
    border: 0.15em solid var(--voice-mode-bg);
    border-radius: 50%;
    opacity: 0;
  }

  .mode-switch__voice-wave:nth-child(1) {
    animation: ripple 2s infinite;
  }

  .mode-switch__voice-wave:nth-child(2) {
    animation: ripple 2s infinite 0.3s;
  }

  .mode-switch__voice-wave:nth-child(3) {
    animation: ripple 2s infinite 0.6s;
  }

  /* Animations */
  @keyframes float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  @keyframes pulse {
    0%, 100% {
      height: 40%;
    }
    50% {
      height: 100%;
    }
  }

  @keyframes ripple {
    0% {
      width: 30%;
      height: 30%;
      opacity: 0.8;
    }
    100% {
      width: 100%;
      height: 100%;
      opacity: 0;
    }
  }

  /* Actions - checked state */
  .mode-switch__checkbox:checked + .mode-switch__container {
    background-color: var(--voice-mode-bg);
  }

  .mode-switch__checkbox:checked + .mode-switch__container .mode-switch__label {
    transform: translateX(0); /* Keep label centered */
  }

  .mode-switch__checkbox:checked + .mode-switch__container .mode-switch__circle-container {
    left: calc(100% - var(--circle-container-offset) - var(--circle-container-diameter));
  }

  .mode-switch__checkbox:checked + .mode-switch__container .mode-switch__circle-container:hover {
    left: calc(100% - var(--circle-container-offset) - var(--circle-container-diameter) - 0.187em);
  }

  .mode-switch__circle-container:hover {
    left: calc(var(--circle-container-offset) + 0.187em);
  }

  /* Slide text out and voice in when checked */
  .mode-switch__checkbox:checked + .mode-switch__container .mode-switch__text {
    transform: translateX(-100%);
  }

  .mode-switch__checkbox:checked + .mode-switch__container .mode-switch__voice {
    transform: translateX(0);
  }

  /* Show/hide punctuation and waveform based on mode */
  .mode-switch__checkbox:checked + .mode-switch__container .mode-switch__punctuation {
    opacity: 0;
  }

  .mode-switch__checkbox:checked + .mode-switch__container .mode-switch__waveform {
    opacity: 1;
  }
`;

export default TextVoiceSwitch;