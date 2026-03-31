const videos = [
  {id:"dQw4w9WgXcQ", title:"音楽①"},
  {id:"3JZ_D3ELwOQ", title:"音楽②"},
  {id:"9bZkp7q19f0", title:"音楽③"}
];

const list = document.getElementById("list");
const favBox = document.getElementById("fav");
const player = document.getElementById("player");
const search = document.getElementById("search");

let fav = JSON.parse(localStorage.getItem("fav") || "[]");

// 表示
function render(data){
  list.innerHTML="";
  data.forEach(v=>{
    const div = document.createElement("div");

    div.innerHTML = `
      <img src="https://img.youtube.com/vi/${v.id}/0.jpg">
      <p>${v.title}</p>
    `;

    div.onclick = ()=>{
      player.src = `https://www.youtube.com/embed/${v.id}?autoplay=1`;
    };

    list.appendChild(div);
  });
}

// 🔍 検索（これが重要）
window.doSearch = function(){
  const k = search.value.toLowerCase();
  const result = videos.filter(v => v.title.toLowerCase().includes(k));
  render(result);
}

// Enterキー対応
search.addEventListener("keydown", (e)=>{
  if(e.key === "Enter"){
    doSearch();
  }
});

// 初期表示
render(videos);
