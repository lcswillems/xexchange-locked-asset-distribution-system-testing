import fs from "node:fs";
import { assertAccount, d, e, FSWorld, Proxy } from "xsuite";

const main = async () => {
  using world = await loadFSWorldWithState();
  const distribution = world.newContract(distributionAddress);
  
  const owner = await world.createWallet({
    address: ownerAddress,
    balance: 10n ** 18n,
  });
  await owner.upgradeContract({
    callee: distribution,
    code: "file:locked-asset-distribution.wasm",
    codeMetadata: ["readable", "upgradeable"],
    gasLimit: 100_000_000,
  });

  const wallet = await world.createWallet({
    balance: 10n * 10n ** 18n,
  });

  await wallet.callContract({
    callee: distribution,
    funcName: "clearSingleValueMappers",
    gasLimit: 10_000_000,
  });

  let continueClearCommunityDistributionList = true;
  while (continueClearCommunityDistributionList) {
    const res = await wallet.callContract({
      callee: distribution,
      funcName: "clearCommunityDistributionList",
      funcArgs: [e.U64(10)],
      gasLimit: 600_000_000,
    });
    const [counter, remaining] = d.Tuple(d.U64(), d.Usize()).fromTop(res.returnData[0]);
    continueClearCommunityDistributionList = remaining > 0;
    console.log("clearCommunityDistributionList", counter, remaining);
  }

  let continueClearUserLockedAssetMap = true;
  while (continueClearUserLockedAssetMap) {
    const res = await wallet.callContract({
      callee: distribution,
      funcName: "clearUserLockedAssetMap",
      funcArgs: [e.U64(350)],
      gasLimit: 600_000_000,
    });
    const [counter, remaining] = d.Tuple(d.U64(), d.Usize()).fromTop(res.returnData[0]);
    continueClearUserLockedAssetMap = remaining > 0;
    console.log("clearUserLockedAssetMap", counter, remaining);
  }

  assertAccount(
    await distribution.getAccount(),
    { kvs: {} }
  )
}

const loadFSWorldWithState = async () => {
  if (!fs.existsSync(accountWithoutKeysPath)) {
    const proxy = new Proxy("https://gateway.multiversx.com");
    const account = await proxy.getSerializableAccountWithoutKvs(distributionAddress);
    fs.writeFileSync(accountWithoutKeysPath, JSON.stringify(account));
  }
  const account = {
    ...JSON.parse(fs.readFileSync(accountWithoutKeysPath, "utf-8")),
    kvs: JSON.parse(fs.readFileSync(keysResponsePath, "utf-8")).data.pairs,
  };
  const world = await FSWorld.start();
  await world.setAccount(account);
  return world;
}

const accountWithoutKeysPath = "accountWithoutKeys.json";
const keysResponsePath = "keys-response.json";
const distributionAddress = "erd1qqqqqqqqqqqqqpgqyg62a3tswuzun2wzp8a83sjkc709wwjt2jpssphddm";
const ownerAddress = "erd1ss6u80ruas2phpmr82r42xnkd6rxy40g9jl69frppl4qez9w2jpsqj8x97";

main();
