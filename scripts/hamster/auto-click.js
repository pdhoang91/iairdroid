import { checkTasks, clickWithAPI } from "../../utils/hamster.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";

const runForAuthorization = async (authorization) => {
  await checkTasks(authorization);

  while (true) {
    const requests = Array.from({ length: 5 }, () =>
      clickWithAPI(authorization)
    );
    const results = await Promise.all(requests);
    const clickData = results[results.length - 1];
    if (clickData && clickData.availableTaps < 10) {
      console.log(
        `Token ${authorization} có năng lượng nhỏ hơn 10. Chuyển token tiếp theo...`
      );
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

const main = async () => {
  const secrets = await getAllHamsterAddress();
  while (true) {
    for (const secret of secrets) {
      await runForAuthorization(secret);
    }
    console.log(
      "Đã chạy xong tất cả các token, nghỉ 1 giây rồi chạy lại từ đầu..."
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

main();
