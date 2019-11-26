export function createFormBody(paramsObject) {
    const keyValuePairs = Object.entries(paramsObject).map(
      ([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value)
    )
    return keyValuePairs.join('&')
}