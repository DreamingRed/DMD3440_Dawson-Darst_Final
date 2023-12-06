drop = document.getElementById('droparea')
placeholder = document.getElementById('nofile')
placeholder.style.fontFamily = "Arial,Verdana"
adaptiveFontSize = String(Math.ceil(window.innerWidth / 30)) + "px"
placeholder.style.fontSize = adaptiveFontSize


let loaded = false
let testing = true
 
drop.style.width = `${window.innerWidth}px`
drop.style.height = `${window.innerHeight}px`
 
// This was pulled straight from googles example for drag/drop file.
// Then modified to use the whole screen and for our file.
// Source: https://web.dev/articles/read-files

drop.addEventListener('dragover', (event) => {
    event.stopPropagation()
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
});
 
drop.addEventListener('drop', (event) => {
    event.stopPropagation()
    event.preventDefault()
    const fileList = event.dataTransfer.files
    //fileList[0].text is our text
    console.log(fileList)
    fileList[0].text().then((rawText) => {
    prevSvg = document.getElementById('currentPcb') ; if (prevSvg) { prevSvg.remove() } ;
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") ; svg.setAttribute('id', 'currentPcb') ;
    drop.appendChild(svg)
    loaded = true
    console.log(fileList)
    if (loaded) {
        placeholder.remove()
    }
    displayGerber(rawText, svg, testing)
  })
});
 
// Main function that aggragates all the others
function displayGerber(rawInput, svg, testing) {
    formInput = cleanGerber(rawInput)
    const measurementType = getMeasurementType(formInput)
    const decodeMap = createDecodeMap(formInput, testing)
    console.log(decodeMap)
    coordInput = formatCoordinates(formInput, testing)
    console.log(coordInput)
    placeAllFeatures(coordInput, decodeMap, svg, testing)
}
 
// Cleans the raw text, and outputs a ordered, formatted array of
// Extended commands and commands.
function cleanGerber(rawInput) {
    rawInput = rawInput.replace(/(\r\n|\n|\r| )/gm, "");
    console.log(rawInput)
 
    // Now we're gonna take our string, and sort each command into an array
    // We need to look for %extended commands*% and basic commands*
    // Extended commands can have multiple commands, so splitting by * won't work
    // If I'm going to refactor this at some point, I think I will need to make each
    // extended command it's own array. Not a priority right now but might cause issues down the line?
    rawInputLen = rawInput.length
    console.log(rawInputLen)
    formInput = []
    commandNum = 0
    extended = false
    for (let i = 0 ; i < rawInputLen ; i++) {
        if (rawInput[i] == '%') {
            if (extended) {
                extended = false
                commandNum++
            }
            else {
                extended = true
            }
        }
        else if (rawInput[i] == '*' && !extended) {
            commandNum++
        }
        else if (rawInput[i] == '*' && extended) {
            formInput[commandNum] += rawInput[i]
        }
        else {
            if (formInput[commandNum] == null) {
                formInput[commandNum] = rawInput[i]
            }
            else {
                formInput[commandNum] += rawInput[i]
            }      
        }        
    }
    console.log(formInput)
    return formInput
}
 
// Helper function to get the measurement type for the gerber.
function getMeasurementType(formInput) {
    inRegex = new RegExp('MOIN')
    mmRegex = new RegExp('MOMM')
    for (i in formInput) {
        if (inRegex.test(formInput[i])) {
            return 'in'
        }
        else if (mmRegex.test(formInput[i])) {
            return 'mm'
        }
    }
    throw (
        new Error('Measurement type not found.')
    )
}
 
// Helper function to create dictionary of Decodes: Measurements
// We want: D##: (size, type)
// Ex: D11C,0.010 = Decode D11, size 0.010, type C - circle
function createDecodeMap(formInput, testing = false) {
    const decodeMap = new Map()
    adRegex = new RegExp('AD')
    decodeRegex = /D\d\d+/
    sizeRegex = /(?<=,)\d+((?=\*)|\.?\d+)/
    typeRegex = /[^\d\s]+(?=,)/
    for (command of formInput) {
        if (adRegex.test(command)) {
            // We're going to try to use regex.match to Extract the decode.
            decode = command.match(decodeRegex)[0]
            size = command.match(sizeRegex)[0]
            type = command.match(typeRegex)[0]
            if (testing) { console.log(`${decode} = size: ${size}, type: ${type}`) }
            decodeMap.set(decode, [size, type])
        }
    }
    if (testing) { console.log(decodeMap)}
    return decodeMap
}
 
// This function is going to transform the instructions in the gerber file, to a form
// usuable in the generation of features in the browser. First, we need to get the FSLA values
// These will tell us where to put our decimal points when converting our strings to floats.
// Then we need to convert each string into a tuple (use list for this). This also requires
// remembering X or Y values, as it doesn't provide coords on each line. Example:
// [0,0]        X0Y0D02
// [0,10]       Y10D01
// [20,10]      X20D01
function formatCoordinates(formInput, testing = false) {
    formatSpecRegex = /FSLA/
    xFormatSpecRegex = /(?<=FSLAX)\d+/
    yFormatSpecRegex = /(?<=FSLAX\d\dY)\d+/
    xLocRegex = /(?<=^X)-*\d+/
    yLocRegex = /(?<=Y)-*\d+/
    featureTypeRegex = /D0[1|2|3]/
    // Get our format spec values
    for (i in formInput) {
        if (testing) { console.log(`FORMATTED INPUT LINE: ${formInput[i]}\n`)}
        if (formatSpecRegex.test(formInput[i])) {
            xFormatSpecString = formInput[i].match(xFormatSpecRegex)[0]
            yFormatSpecString = formInput[i].match(yFormatSpecRegex)[0]
            formInput.splice(i, 1)
            break
        }
    }
    // Prep the values we've gotten for actual use.
    xFormatSpecIntNum = Number(xFormatSpecString[0])
    yFormatSpecIntNum = Number(yFormatSpecString[0])
    xFormatSpecFloatNum = Number(xFormatSpecString[1])
    yFormatSpecFloatNum = Number(yFormatSpecString[1])
    xLen = xFormatSpecIntNum + xFormatSpecFloatNum
    yLen = yFormatSpecIntNum + yFormatSpecFloatNum
 
    // These are needed in case theres a jump in the coordinates, but the latest still needs
    // access to the last value.
    coordIndex = 0
    coordList = []
    featureIndex = 0
    featureList = []
 
    stringFormInput = formInput
    for (i in formInput) {
        if (testing) { console.log(`FORM INPUT FOR COORDS: ${formInput[i]}`) }
        // Check to see if this command has both a x and y loc
        if (xLocRegex.test(formInput[i]) && yLocRegex.test(formInput[i])) {
            xLoc = formInput[i].match(xLocRegex)[0]
            yLoc = formInput[i].match(yLocRegex)[0]
            if (featureTypeRegex.test(formInput[i])) {
                featureTypeString = formInput[i].match(featureTypeRegex)[0]
                featureList.push(featureTypeString)
                featureIndex++
            }
            else {
                featureTypeString = featureList[featureIndex-1]
            }
           
            // if the coord is less than or equal to the sum of the required integers + floating points,
            // it must be padded from the left the difference.
            // This needs an addition check so that it can appropriately deal with negative numbers
            // ex '-' + '000' + 50000 = -00050000 => -00.050000 after all our processing.
            if (xLoc.length <= xLen+1) {
                if (xLoc[0] == '-') {
                    zeroPadding = (xLen + 1) - xLoc.length
                    xLoc = xLoc.slice(0,1) + '0'.repeat(zeroPadding) + xLoc.slice(1)
                    xLoc = xLoc.slice(0,xFormatSpecIntNum+1) + '.' + xLoc.slice(xFormatSpecIntNum+1, xLen+1)
                }
                else {
                    zeroPadding = xLen - xLoc.length
                    xLoc = '0'.repeat(zeroPadding) + xLoc
                    xLoc = xLoc.slice(0,xFormatSpecIntNum) + '.' + xLoc.slice(xFormatSpecIntNum, xLen)
                }  
            }
            if (yLoc.length <= yLen+1) {
                if (yLoc[0] == '-') {
                    zeroPadding = (yLen + 1) - yLoc.length
                    yLoc = yLoc.slice(0,1) + '0'.repeat(zeroPadding) + yLoc.slice(1)
                    yLoc = yLoc.slice(0,yFormatSpecIntNum+1) + '.' + yLoc.slice(yFormatSpecIntNum+1, yLen+1)
                }
                else {
                    zeroPadding = yLen - yLoc.length
                    yLoc = '0'.repeat(zeroPadding) + yLoc
                    yLoc = yLoc.slice(0,yFormatSpecIntNum) + '.' + yLoc.slice(yFormatSpecIntNum, yLen)
                }  
            }
            // splice in the decimal point.
           
            
            if (testing) { console.log(`FEATURE TYPE STRING: ${featureTypeString}\n`) }
            formInput[i] = [xLoc, yLoc, featureTypeString]
            coordList.push([xLoc, yLoc])
            coordIndex++
        }
        // Does it just have a new X value? if so find the last Y value and use it again.
        else if (xLocRegex.test(formInput[i])) {
            xLoc = formInput[i].match(xLocRegex)[0]
            if (featureTypeRegex.test(formInput[i])) {
                featureTypeString = formInput[i].match(featureTypeRegex)[0]
                featureList.push(featureTypeString)
                featureIndex++
            }
            else {
                featureTypeString = featureList[featureIndex-1]
            }
            if (xLoc.length <= xLen+1) {
                if (xLoc[0] == '-') {
                    zeroPadding = (xLen + 1) - xLoc.length
                    xLoc = xLoc.slice(0,1) + '0'.repeat(zeroPadding) + xLoc.slice(1)
                    xLoc = xLoc.slice(0,xFormatSpecIntNum+1) + '.' + xLoc.slice(xFormatSpecIntNum+1, xLen+1)
                }
                else {
                    zeroPadding = xLen - xLoc.length
                    xLoc = '0'.repeat(zeroPadding) + xLoc
                    xLoc = xLoc.slice(0,xFormatSpecIntNum) + '.' + xLoc.slice(xFormatSpecIntNum, xLen)
                }  
            }
            
            if (testing) { console.log(`FEATURE TYPE STRING: ${featureTypeString}\n`) }
            formInput[i] = [xLoc, coordList[coordIndex-1][1], featureTypeString]
            coordList.push([xLoc, coordList[coordIndex-1][1]])
            coordIndex++
        }
        // Does it just have a new Y value? if so find the last X value and use it again.
        else if (yLocRegex.test(formInput[i])) {
            yLoc = formInput[i].match(yLocRegex)[0]
            if (featureTypeRegex.test(formInput[i])) {
                featureTypeString = formInput[i].match(featureTypeRegex)[0]
                featureList.push(featureTypeString)
                featureIndex++
            }
            else {
                featureTypeString = featureList[featureIndex-1]
            }
            if (yLoc.length <= yLen+1) {
                if (yLoc[0] == '-') {
                    zeroPadding = (yLen + 1) - yLoc.length
                    yLoc = yLoc.slice(0,1) + '0'.repeat(zeroPadding) + yLoc.slice(1)
                    yLoc = yLoc.slice(0,yFormatSpecIntNum+1) + '.' + yLoc.slice(yFormatSpecIntNum+1, yLen+1)
                }
                else {
                    zeroPadding = yLen - yLoc.length
                    yLoc = '0'.repeat(zeroPadding) + yLoc
                    yLoc = yLoc.slice(0,yFormatSpecIntNum) + '.' + yLoc.slice(yFormatSpecIntNum, yLen)
                }  
            }
            if (testing) { console.log(`FEATURE TYPE STRING: ${featureTypeString}\n`) }
            formInput[i] = [coordList[coordIndex-1][0], yLoc, featureTypeString]
            coordList.push([coordList[coordIndex-1][0], yLoc])
            coordIndex++
        }
    }
    return formInput
}
 
// Our goal here, is to use the the clean data we have, and simple generate shapes, line by line
// This is how gerber files are meant to be read. Things we're looking for:
// Dnn, nn >= 10 -- These are the shapes that we have stored in a map.
// LPD - Positive features/LPC - negative features. This will be a toggle.
// We're going to do our conversions from string to float at the last possible moment, so we have the string available for comparisions.
function placeAllFeatures(coordInput, decodeMap, svg, testing = false) {
    // Values may be too small? As long as all values are scaled by the same constant I think I'm good.
    scalingFactor = 50 ; padding = 50 ;
 
    posRegex = /LPD/
    negRegex = /LPC/
    regionStart = /G36/
    regionEnd = /G37/
 
    currentColor = 'black'
    currentSize = 0
    currentShape = null
    region = false
    polygonPoints = []
 
    currentX = null
    currentY = null
    prevX = null
    prevY = null
 
    // We need to offset this by the largest negative value of x and y
    // Then we will add the largest size feature to this value to assure that we have all our features in the positive.
    negX = 0
    negY = 0
    posX = 0
    posY = 0
 
    for (i in coordInput) {
        if (Array.isArray(coordInput[i])) {
            if (Number(coordInput[i][0]) < negX) { negX = Number(coordInput[i][0]) }
            if (Number(coordInput[i][1]) < negY) { negY = Number(coordInput[i][1]) }
            if (Number(coordInput[i][0]) > posX) { posX = Number(coordInput[i][0]) }
            if (Number(coordInput[i][1]) > posY) { posY = Number(coordInput[i][1]) }
        }
    }
 
    negX = (negX * -1) * scalingFactor
    negY = (negY * -1) * scalingFactor
 
    // Now, we need to find the largest size feature we have. This is because some placements are dependant on
    // the center, so by offsetting our features by that value / 2 , we assert that all the features will be
    // in the positive AND full visible. Add padding var just for a nice bit of padding against the edge of the window.
    largestFeature = 0
    decodeMap.forEach((value, key, map) => { 
        if (value[0] > largestFeature) { 
            console.log(`LARGEST FEATURE: ${value[0]}, ${key}, ${map}`)
            largestFeature = value[0] 
        }
    })
    largestFeature = ((largestFeature * scalingFactor) / 2)
   
    // What we're going to do here is set the SVG view box to the biggest value we expect to have.
    // This will ensure that regardless of the PCB size, it's all included in the SVG viewbox
    // We need negXY and largestFeature ready for this, because they all factor in.
    posX = (posX * scalingFactor) + negX + largestFeature + (padding * 2) ; 
    posY = (posY * scalingFactor) + negY + largestFeature + (padding * 2) ;
    document.getElementById('droparea').style.width = `${posX}px` ; 
    document.getElementById('droparea').style.height = `${posY}px`
    svg.setAttribute('viewBox', `0 0 ${posX} ${posY}`)
 
    for (i in coordInput) {
        // if it's a string, it's either a decode, or some kind of instruction
        if (typeof coordInput[i] == 'string') {
           
            if (decodeMap.has(coordInput[i])) {
                decoded = decodeMap.get(coordInput[i])
                currentSize = decoded[0]
                currentShape = decoded[1]
            }
            // There is a depriciated command G54, that proceeds the decode in some cases.
            // Dnn or G54Dnn are the same command. We don't care which we get.
            else if (decodeMap.has(coordInput[i].slice(3))) {
                decoded = decodeMap.get(coordInput[i].slice(3))
                currentSize = decoded[0]
                currentShape = decoded[1]
            }
            else if (posRegex.test(coordInput[i])) { currentColor = "black" }
            else if (negRegex.test(coordInput[i])) { currentColor = "white" }
            else if (regionStart.test(coordInput[i])) { region = true ; console.log(region) }
            else if (regionEnd.test(coordInput[i])) { region = false ; polygonPoints = [] ; console.log(region)}
        }
        // if it's an array, it's a coordinate package. [0] = x, [1] = y, [2] = D01|2|3|4
        else if (Array.isArray(coordInput[i])) {
           
            // D01 will draw lines from prevX,prevY to CurrentX,CurrentY
            if (coordInput[i][2] == 'D01') {
                prevX = currentX
                prevY = currentY
                currentX = (Number(coordInput[i][0]) * scalingFactor) + negX + largestFeature
                // This expression flips the display. This is because web stuff renders from the top left corner. If the screen was 1000x1000,
                // 0,0 would be top left, 1000,1000 would be bottom right.
                currentY = (((Number(coordInput[i][1]) * scalingFactor) + negY + largestFeature) * -1) + posY
 
                // With regions, we're essentially building a polygon with n points. My working philosophy is to track x1,y1 ... xn,yn until there a line that returns
                // to exactly x1,y1. My understanding is that a closing line is required to finish the polygon - there is no assumed closing line.
                if (region) {
                    // This is gonna get a bit (just a bit?) messy, but my working idea is that we get a 3D array that looks like this [[[StringX1,Y2],[CurrentX1,Y1]],[[StringX2,Y2],[CurrentX2,Y2]]...N times]
                    // We will use the stringXY for comparisons. If StringX1,Y1 == StringXn>1,Yn>1, we have a completed shape and we should now render it.
                    polygonPoints.push([coordInput[i],[currentX,currentY]])
                    if (polygonPoints[0][0][0] === polygonPoints[polygonPoints.length-1][0][0] && polygonPoints[0][0][1] === polygonPoints[polygonPoints.length-1][0][1] && polygonPoints.length > 1) {
                        // This pop exists because svg polygons automatically connect the last point to the first.
                        polygonPoints.pop()
                        polygonPointsString = ''
                        // Polygon.points take a very specific string: 'x1 y1 x2 y2 x3 y3' This formats to that.
                        for (i in polygonPoints) {
                            if (i > 0) { polygonPointsString += ` ${polygonPoints[i][1][0]} ${polygonPoints[i][1][1]}` }
                            else { polygonPointsString += `${polygonPoints[i][1][0]} ${polygonPoints[i][1][1]}` }
                        }        
                        polygon = document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
                        polygon.setAttribute('points', polygonPointsString)
                        polygon.setAttribute('fill', currentColor)
                        svg.appendChild(polygon) ; polygonPoints = [] ;
                    }
                }
                else {
                    line = document.createElementNS("http://www.w3.org/2000/svg", 'line');
                    line.setAttribute('x1', prevX) ; line.setAttribute('y1', prevY) ;
                    line.setAttribute('x2', currentX) ; line.setAttribute('y2', currentY) ;
                    line.setAttribute('stroke', currentColor)
                    line.setAttribute('stroke-width', currentSize * scalingFactor)
                    if (currentShape == 'C') {
                        line.setAttribute('stroke-linecap', "round")
                    }
                    svg.appendChild(line)
                    if (testing) { console.log(`Line from ${prevX},${prevY} to ${currentX},${currentY} - size ${currentSize * scalingFactor}`) }
                }        
            }
            // D02 will move the currentX, currentY to the location WITHOUT drawing anything
            else if (coordInput[i][2] == 'D02') {
                currentX = (Number(coordInput[i][0]) * scalingFactor) + negX + largestFeature
                currentY = (((Number(coordInput[i][1]) * scalingFactor) + negY + largestFeature) * -1) + posY
               
                if (region) {
                    polygonPoints.push([coordInput[i],[currentX,currentY]])
                }
            }
            // D03 will create a shape (NOT LINE) at the location.
            else if (coordInput[i][2] == 'D03') {
                prevX = currentX
                prevY = currentY
                currentX = (Number(coordInput[i][0]) * scalingFactor) + negX + largestFeature
                currentY = (((Number(coordInput[i][1]) * scalingFactor) + negY + largestFeature) * -1) + posY
 
                if (currentShape == 'C') {
                    //console.log(`drawing circle at ${[currentX * scalingFactor,currentY * scalingFactor]}`)
                    circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
                    circle.setAttribute('cx', currentX) ; circle.setAttribute('cy', currentY)
                    circle.setAttribute('r', currentSize * scalingFactor / 2)
                    circle.setAttribute('fill', currentColor)
                    svg.appendChild(circle)
                    if (testing) { console.log(`Circle at ${currentX},${currentY} - size: ${currentSize * scalingFactor}`) }
                }
            }
        }
    }
    if (testing) { console.log(`NegX: ${negX}, Neg Y: ${negY}, Largest Feature: ${largestFeature}`) }
}
