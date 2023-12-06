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