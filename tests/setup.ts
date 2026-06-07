// Polyfill Blob.arrayBuffer for jsdom test environment
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function () {
    const reader = new FileReader()
    return new Promise<ArrayBuffer>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(this)
    })
  }
}
