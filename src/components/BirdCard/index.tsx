import clsx from "clsx";
import styles from "./styles.module.css";
import { useState } from "react";
import NotFoundImage from "@site/static/img/not-found.png";

export default function BirdCard({
  index,
  name,
  speciesCode,
  photo,
  recording,
}): JSX.Element {
  const [play, setPlay] = useState(false);

  return (
    <div className="container">
      <div className="row padding-bottom--lg">
        <div className="col col--5">
          <div className="col-demo">
            <div className="card shadow--tl">
              {photo ? (
                <img
                  className="card__image"
                  // style={{ height: "400px", objectFit: "cover" }}
                  loading="lazy"
                  src={`https://cdn.download.ams.birds.cornell.edu/api/v1/asset/${photo}/640`}
                />
              ) : (
                <img src={NotFoundImage} />
              )}
              {recording && (
                <img
                  className="card__image padding-top--none"
                  loading="lazy"
                  src={
                    // !photo
                    //   ? `https://cdn.download.ams.birds.cornell.edu/api/v1/asset/${recording}/poster`
                    // :
                    `https://cdn.download.ams.birds.cornell.edu/api/v2/asset/${recording}/default/preview`
                  }
                />
              )}
              <div className="card__body">
                <h4>
                  <a href={`./birds/${speciesCode}`}>{name}</a>
                  <span className={styles.alignRight}>#{index}</span>
                </h4>
              </div>
              <div className="card__footer ">
                <div className="button-group button-group--block">
                  <a
                    className="button button--secondary"
                    href={`https://ebird.org/species/${speciesCode}/`}
                    target="_blank"
                  >
                    eBird
                  </a>
                  <button
                    disabled={!photo}
                    className="button button--secondary"
                  >
                    Photo {photo ? "📷" : "🙈"}
                  </button>
                  <button
                    disabled={!recording}
                    className="button button--secondary"
                    onClick={() => {
                      const audioElement = document.getElementById(
                        `audio-${recording}`
                      ) as HTMLAudioElement;
                      if (!play) {
                        audioElement.play();
                        setPlay(true);
                      } else {
                        audioElement.pause();
                        setPlay(false);
                      }
                    }}
                  >
                    Audio {recording ? (play ? "🔇" : "🔊") : "🙉"}
                  </button>
                </div>
                <audio
                  id={`audio-${recording}`}
                  src={`https://cdn.download.ams.birds.cornell.edu/api/v2/asset/${recording}/mp3`}
                  preload="none"
                ></audio>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
