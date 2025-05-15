window.addEventListener("DOMContentLoaded", function () {


const dropArea = document.getElementById("drop-area");
const fileElem = document.getElementById("fileElem");
const fileSelect = document.getElementById("fileSelect");
const fileList = document.getElementById("file-list");

fileSelect.addEventListener("click", () => fileElem.click());
["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

["dragenter", "dragover"].forEach(eventName => {
  dropArea.classList.add("highlight");
});

["dragleave", "drop"].forEach(eventName => {
  dropArea.classList.remove("highlight");
});

dropArea.addEventListener("drop", handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles(files);
}

function handleFiles(files) {
  [...files].forEach(file => {
    if (file.name.endsWith(".zip")) {
      const li = document.createElement("li");
      li.textContent = "Folder name: " + file.name;
      fileList.appendChild(li);
      extractCSVFromZip(file);
    }
  });
}

function extractCSVFromZip(zipFile) {
  JSZip.loadAsync(zipFile).then(zip => {
    const csvFileName = Object.keys(zip.files).find(name =>
        name.toLowerCase().endsWith("activities.csv")
      );      

    if (!csvFileName) {
      alert("activities.csv not found in ZIP.");
      return;
    }

    return zip.files[csvFileName].async("string");
  }).then(csvText => {
    if (csvText) {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log("Parsed CSV rows:", results.data.length);
          console.log("Sample row 0:", results.data[0]);
          processRunData(results.data);
        }
      });
      console.log("CSV loaded, sample:", csvText.slice(0, 200));
    }
  }).catch(err => console.error("ZIP processing error:", err));
}

function processRunData(data) {
  const runNumbers5k = [], dates5k = [], times5k = [], paces5k = [];
  const runNumbers10k = [], dates10k = [], times10k = [], paces10k = [];

  let runNum5k = 0;
  let runNum10k = 0;

  data.forEach((row, index) => {
    const activityType = row["Activity Type"]?.trim();
    const distanceStr = row["Distance"];
    const elapsedStr = row["Elapsed Time"];
    const dateStr = row["Activity Date"];
  
    if (activityType !== "Run") return;
  
    const distanceKm = parseFloat(distanceStr);
    const elapsedMin = parseFloat(elapsedStr) / 60;
    const date = new Date(dateStr);
  
    if (isNaN(distanceKm) || isNaN(elapsedMin) || isNaN(date)) {
      console.log(`Skipping invalid row:`, row);
      return;
    }
  
    const pace = elapsedMin / distanceKm;
    const paceMin = Math.floor(pace);
    const paceSec = Math.round((pace - paceMin) * 60).toString().padStart(2, "0");
    const formattedPace = `${paceMin}:${paceSec}/km`;
  
    if (distanceKm >= 4.9 && distanceKm < 5.1) {
      runNumbers5k.push(runNumbers5k.length + 1);
      dates5k.push(date);
      times5k.push(elapsedMin);
      paces5k.push(formattedPace);
    } else if (distanceKm >= 9.9 && distanceKm < 10.1) {
      runNumbers10k.push(runNumbers10k.length + 1);
      dates10k.push(date);
      times10k.push(elapsedMin);
      paces10k.push(formattedPace);
    }
  });

  drawChart("chart5k", dates5k, times5k, paces5k, "5K Runs", "blue");
  drawChart("chart10k", dates10k, times10k, paces10k, "10K Runs", "red");
}

function drawChart(canvasId, dates, times, paces, label, color) {
  new Chart(document.getElementById(canvasId), {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: `${label} Elapsed Time (min)`,
        data: times,
        borderColor: color,
        tension: 0.3,
        pointBackgroundColor: "white"
      }]
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => `Time: ${ctx.raw.toFixed(2)} min, Pace: ${paces[ctx.dataIndex]}`
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'month',
            displayFormats: {
                month: 'MMM yyyy'
              }
          },
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Elapsed Time (min)'
          }
        }
      }
    }
  });
}

});
