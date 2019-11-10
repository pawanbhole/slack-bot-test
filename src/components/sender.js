
module.exports = function(payload) {
    return fetch('http://localhost:3000', {
        method: 'post',
        body:    JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
    })
    .then(res => res.json())
    .then(json => console.log(json));
}
