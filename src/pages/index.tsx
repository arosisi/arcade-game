import React, { useCallback, useEffect, useRef, useState } from "react";
import useSound from "use-sound";
import { round, generatePositionDegree, didHit } from "@/utils/helpers";

const constants = {
  innerCircleDiameter: 200,
  rotatingStickHeigh: 10,
  smallCircleDiameter: 50,
  initialRotationStepSize: 0.4,
  rotationStepSizeIncrement: 0.015,
  maxRotationStepSize: 2,
  hitsToWin: 30,
};

export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Generate position only on client side to avoid SSR mismatch
  const initialPositionRef = useRef<number | null>(null);
  if (initialPositionRef.current === null) {
    initialPositionRef.current = generatePositionDegree(0);
  }

  const [gameState, setGameState] = useState(() => ({
    rotationDegree: 0,
    rotationDirection: 1,
    rotationStepSize: constants.initialRotationStepSize,
    positionDegree: initialPositionRef.current,
    hitsLeftToWin: constants.hitsToWin,
    hasStickEntered: false,
    hasStickExited: false,
    hasMissed: false,
  }));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [hitSoundPlay, { stop: hitSoundStop }] = useSound("/arcade-game/sounds/correct-choice.mp3");
  const [lostSoundPlay, { stop: lostSoundStop }] = useSound("/arcade-game/sounds/failure-drum-sound-effect.mp3");
  const [wonSoundPlay, { stop: wonSoundStop }] = useSound("/arcade-game/sounds/success-fanfare-trumpets.mp3");

  const rotationIntervalRef = useRef<number | null>(null);
  const attemptToHitFuncRef = useRef<EventListener | null>(null);

  const stopAllSounds = useCallback(() => {
    hitSoundStop();
    lostSoundStop();
    wonSoundStop();
  }, [hitSoundStop, lostSoundStop, wonSoundStop]);

  const setRotationInterval = useCallback(() => {
    rotationIntervalRef.current = window.setInterval(() => {
      setGameState(
        ({
          rotationDegree,
          rotationDirection,
          rotationStepSize,
          positionDegree,
          hasStickEntered,
          hasStickExited,
          ...rest
        }) => {
          const newHasStickEntered = didHit(rotationDegree, positionDegree);
          const newHasStickExited = hasStickEntered && !didHit(rotationDegree, positionDegree);
          if (!newHasStickEntered && newHasStickExited) {
            stopAllSounds();
            lostSoundPlay();
            window.clearInterval(rotationIntervalRef.current as number);
            window.removeEventListener("keypress", attemptToHitFuncRef.current as EventListener);
            window.removeEventListener("touchstart", attemptToHitFuncRef.current as EventListener);
          }
          return {
            rotationDegree: round(rotationDegree + round(rotationDirection * rotationStepSize)) % 360,
            rotationDirection,
            rotationStepSize,
            positionDegree,
            hasStickEntered: newHasStickEntered,
            hasStickExited: newHasStickExited,
            ...rest,
          };
        },
      );
    }, 1);
  }, [stopAllSounds, lostSoundPlay]);

  const setAttemptToHitFunc = useCallback(() => {
    attemptToHitFuncRef.current = () => {
      setGameState(
        ({
          rotationDegree,
          rotationDirection,
          rotationStepSize,
          positionDegree,
          hitsLeftToWin,
          hasStickEntered,
          hasStickExited,
          hasMissed,
          ...rest
        }) => {
          if (didHit(rotationDegree, positionDegree)) {
            stopAllSounds();
            hitSoundPlay();
            return {
              rotationDegree,
              rotationDirection: rotationDirection > 0 ? -1 : 1,
              rotationStepSize: Math.min(
                round(rotationStepSize + constants.rotationStepSizeIncrement),
                constants.maxRotationStepSize,
              ),
              positionDegree: hitsLeftToWin > 1 ? generatePositionDegree(rotationDegree) : positionDegree,
              hitsLeftToWin: hitsLeftToWin - 1,
              hasStickEntered: false,
              hasStickExited: false,
              hasMissed,
              ...rest,
            };
          }

          stopAllSounds();
          lostSoundPlay();
          window.clearInterval(rotationIntervalRef.current as number);
          window.removeEventListener("keypress", attemptToHitFuncRef.current as EventListener);
          window.removeEventListener("touchstart", attemptToHitFuncRef.current as EventListener);
          return {
            rotationDegree,
            rotationDirection,
            rotationStepSize,
            positionDegree,
            hitsLeftToWin,
            hasStickEntered: false,
            hasStickExited: false,
            hasMissed: true,
            ...rest,
          };
        },
      );
    };

    window.addEventListener("keypress", attemptToHitFuncRef.current as EventListener);
    window.addEventListener("touchstart", attemptToHitFuncRef.current as EventListener);
  }, [stopAllSounds, hitSoundPlay, lostSoundPlay]);

  useEffect(() => {
    if (hasStarted) {
      setRotationInterval();
      setAttemptToHitFunc();
    }

    return () => {
      window.clearInterval(rotationIntervalRef.current as number);
      window.removeEventListener("keypress", attemptToHitFuncRef.current as EventListener);
      window.removeEventListener("touchstart", attemptToHitFuncRef.current as EventListener);
    };
  }, [hasStarted, setRotationInterval, setAttemptToHitFunc]);

  useEffect(() => {
    if (gameState.hitsLeftToWin === 0) {
      stopAllSounds();
      wonSoundPlay();
      window.clearInterval(rotationIntervalRef.current as number);
      window.removeEventListener("keypress", attemptToHitFuncRef.current as EventListener);
      window.removeEventListener("touchstart", attemptToHitFuncRef.current as EventListener);
    }
  }, [gameState.hitsLeftToWin, stopAllSounds, wonSoundPlay]);

  const restart = () => {
    setGameState(
      ({
        rotationDegree,
        rotationStepSize,
        positionDegree,
        hitsLeftToWin,
        hasStickEntered,
        hasStickExited,
        hasMissed,
        ...rest
      }) => ({
        rotationDegree,
        rotationStepSize: constants.initialRotationStepSize,
        positionDegree: generatePositionDegree(rotationDegree),
        hitsLeftToWin: constants.hitsToWin,
        hasStickEntered: false,
        hasStickExited: false,
        hasMissed: false,
        ...rest,
      }),
    );
    setRotationInterval();
    setAttemptToHitFunc();
  };

  // Prevent hydration mismatch by not rendering until client-side mounted
  if (!isMounted) {
    return null;
  }

  return (
    <div className="App">
      {!hasStarted && (
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%) translateY(-50%)",
          }}
        >
          <button onClick={() => setHasStarted(true)}>Start</button>
        </div>
      )}
      {gameState.hitsLeftToWin === 0 && (
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "50%",
            transform: "translateX(-50%) translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 50,
          }}
        >
          You won!
          <button onClick={restart}>Restart</button>
        </div>
      )}
      {((!gameState.hasStickEntered && gameState.hasStickExited) || gameState.hasMissed) && (
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "50%",
            transform: "translateX(-50%) translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 50,
          }}
        >
          You lost!
          <button onClick={restart}>Restart</button>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translateX(-50%) translateY(-50%)",
        }}
      >
        <div
          style={{
            width: constants.innerCircleDiameter,
            height: constants.innerCircleDiameter,
            borderRadius: "50%",
            backgroundColor: "#37b995",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translateX(-50%) translateY(-50%)",
              zIndex: 1,
              fontSize: 100,
              color: "white",
              userSelect: "none",
            }}
          >
            {gameState.hitsLeftToWin}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translateY(-50%) rotate(${gameState.positionDegree}deg)`,
              transformOrigin: "center left",
            }}
          >
            <div
              style={{
                width: constants.innerCircleDiameter / 2,
                height: 0,
              }}
            />
            <div
              style={{
                width: constants.smallCircleDiameter,
                height: constants.smallCircleDiameter,
                borderRadius: "50%",
                backgroundColor: "#eab622",
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translateY(-50%) rotate(${gameState.rotationDegree}deg)`,
              transformOrigin: "center left",
              width: constants.innerCircleDiameter / 2 + constants.smallCircleDiameter,
              height: constants.rotatingStickHeigh,
              borderRadius: 4,
              backgroundColor: "#37b995",
            }}
          />
        </div>
      </div>
    </div>
  );
}
