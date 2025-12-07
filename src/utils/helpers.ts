export const round = (num: number) => parseFloat(num.toFixed(3));

export const generatePositionDegree = (rotationDegree: number) => {
  let availablePositionDegrees = new Array(360).fill("").map((_, i) => i);
  const wholeRotationDegree = Math.floor(rotationDegree);
  const bufferDegrees = 45;
  for (let i = 0; i < bufferDegrees; i++) {
    availablePositionDegrees = availablePositionDegrees.filter(
      (positionDegree) =>
        positionDegree !== (wholeRotationDegree - i + 360) % 360 &&
        positionDegree !== (wholeRotationDegree + i + 360) % 360,
    );
  }
  const newPositionDegree = availablePositionDegrees[Math.floor(Math.random() * availablePositionDegrees.length)];
  return newPositionDegree;
};

export const didHit = (rotationDegree: number, positionDegree: number) => {
  const diff = Math.abs(((Math.floor(rotationDegree) + 360) % 360) - positionDegree);
  return diff < 15 || 360 - diff < 15;
};
