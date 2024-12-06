import { handleMessage } from "../../utils/blum-game-asm.js";
import { v4 as uuidv4 } from "uuid";
// {
//     hash: "0000aa23889b187dd13f430a59dc7312ff1e2fac6b205123aab670bb7a25f8da"
//     id: "f3b75f73-0733-4b04-9895-a57221363f3f"
//     nonce: 26902
// }

const main = async () => {
  const payloadProof = {
    method: "proof",
    payload: GAME.gameId,
  };
  
  const proof = await callWorker(payloadProof)
  console.log(proof)
  const payloadPack = {
    method: "pack",
    payload: {
      gameId: GAME.gameId,
      challenge: proof,
      earnedAssets: calculatePoint({
        bp: { value: 54 },
        // dogs: {value: 100},
      }),
    },
  };
  console.log(payloadPack)
  const pack = await callWorker(payloadPack)
  console.log(pack)
};

const callWorker = async(payload) => {
//   return await new Promise((resolve) => {
    // const worker = gameWorker();
    const p = uuidv4();
//     const callback = (response) => {
//       response.data.id === p &&
//         (resolve(response.data), worker.removeListener("message", callback));
//     };
//     worker.addListener("message", callback),
//       worker.postMessage({
//         id: p,
//         ...payload,
//       });
//   });
  return await handleMessage({
    id: p,
    ...payload,
  })
};

const GAME = {
  gameId: "ba9e089b-3b29-4f21-9524-70a6efdde18a",
  assets: {
    BOMB: {
      probability: "0.03",
      perClick: "1",
    },
    CLOVER: {
      probability: "0.95",
      perClick: "1",
    },
    FREEZE: {
      probability: "0.02",
      perClick: "1",
    },
  },
};

const calculatePoint = (gameData) => {
  const eventIds = Object.keys(gameData),
    gameInfo = {
      bp: "CLOVER",
      dogs: "DOGS",
    };
  return eventIds.reduce((reward, eventId) => {
    if (!gameData[eventId]) return reward;
    const gameAsset = gameInfo[eventId];
    return (
      (reward[gameAsset] = {
        amount: String(gameData[eventId].value),
      }),
      reward
    );
  }, {});
};

main();
