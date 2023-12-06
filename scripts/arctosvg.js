// A function to take a gerber command for an arc, and turn it into svg arc
//
 
function arcToSvg(arcStartX, arcStartY, arcEndX, arcEndY, arcCenterX, arcCenterY, direction) {
    // get radius from measuring the length of the vector from arcCenter to arcEnd
    r = Math.sqrt(Math.pow(arcCenterX - arcEndX, 2) + Math.pow(arcCenterY - arcEndY, 2))
   
    // 1 = positive rotation = ccw, 0 = negative rotation = cw
    cw = /G02/
    ccw = /G03/
    if (cw.test(direction)) { sweepFlag = '0' }
    else if (ccw.test(direction)) { sweepFlag = '1' }
    fString = `A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${arcEndX} ${arcEndY}`
    return fString
}
 
// const largeArc = angleFromPoints(compXe, compYe, compXs, compYs, x, y) > 0 ? "1" : "0"
// function angleFromPoints(a, b, c, d, e, f) {
//     return ((Math.atan2(f - d, e - c) - Math.atan2(b - d, a - c) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI
//   }
  