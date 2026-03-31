const videos = [
  {id:"dQw4w9WgXcQ", title:"音楽①"},
  {id:"3JZ_D3ELwOQ", title:"音楽②"},
  {id:"9bZkp7q19f0", title:"音楽③"}
];

const list = document.getElementById("list");
const favBox = document.getElementById("fav");
const player = document.getElementById("player");
const search = document.getElementById("search");

// 保存（ブラウザ）
let fav = JSON.parse(localStorage.getItem("fav") || "[]");

// 表示
function render(data){
  list.innerHTML="";
  data.forEach(v=>{
    const div = document.createElement("div");
    div.className="card";

    div.innerHTML = `
      <img src="https://img.youtube.com/vi/${v.id}/0.jpg">
      <p>${v.title}</p>
      <button onclick="event.stopPropagation();addFav('${v.id}')">⭐</button>
    `;

    div.onclick = ()=>{
      player.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
    };

    list.appendChild(div);
  });
}

// お気に入り追加
function addFav(id){
  if(!fav.includes(id)){
    fav.push(id);
    localStorage.setItem("fav", JSON.stringify(fav));
    showFav();
  }
}

// 表示
function showFav(){
  favBox.innerHTML="";
  fav.forEach(id=>{
    const div = document.createElement("div");
    div.innerHTML = `<img src="https://img.youtube.com/vi/${id}/0.jpg">`;
    favBox.appendChild(div);
  });
}

// 検索
search.addEventListener("input", ()=>{
  const k = search.value.toLowerCase();
  render(videos.filter(v=>v.title.toLowerCase().includes(k)));
});

// ログアウト
function logout(){
  localStorage.removeItem("login");
  location.href="login.html";
}

render(videos);
showFav();
