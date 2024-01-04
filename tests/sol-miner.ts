import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolMiner } from "../target/types/sol_miner";
import { IDL } from "../target/types/sol_miner";
import SolMinerIDL from "../target/idl/sol_miner.json";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
  clusterApiUrl,
  Connection
} from "@solana/web3.js";

const GLOBAL_STATE_SEED = "GLOBAL-STATE-SEED";
const VAULT_SEED = "VAULT-SEED";
const USER_STATE_SEED = "USER-STATE-SEED";

const delay = (delayInms) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(1);
    }, delayInms);
  });
}

describe("sol-miner", () => {
  // Configure the client to use the local cluster.
  let provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolMiner as Program<SolMiner>;

  let user = Keypair.generate();
  console.log('user =', user.publicKey.toBase58());
  let admin = Keypair.generate();
  console.log('admin =', admin.publicKey.toBase58());

  it("Is initialized!", async () => {
    // Add your test here.
    await airdropSol(provider, user.publicKey, 10000000000); // 10 sol
    await airdropSol(provider, admin.publicKey, 10000000000);
    console.log("Program id = ", program.programId.toBase58());
    
    const [globalStateKey] = await getGlobalStatePDA(admin.publicKey);
    console.log("global state key = ", globalStateKey.toBase58());
    
    const [vaultKey] = await getVaultPDA();
    console.log("vault key = ", vaultKey.toBase58());
    
    const tx = new Transaction().add(
      await program.methods
        .initialize(admin.publicKey)
        .accounts({
          authority: admin.publicKey,
          globalState: globalStateKey,
          vault: vaultKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY
        })
        .instruction()
    );
    //let simulRes = await provider.simulate(tx, [admin]);
    //console.log('simulRes =', simulRes);
    let txHash = await sendAndConfirmTransaction(provider.connection, tx, [admin]);
    console.log("Your transaction signature", txHash);
    
    let _global_state = await program.account.globalState.fetch(globalStateKey);
    console.log("global state = ", _global_state);
  });

  it("set treasury and dev fee", async () => {
    const [globalStateKey] = await getGlobalStatePDA(admin.publicKey);
    console.log("global state key = ", globalStateKey.toBase58());
    
    const tx = new Transaction().add(
      await program.methods
        .setTreasury(
          new PublicKey("7etbqNa25YWWQztHrwuyXtG39WnAqPszrGRZmEBPvFup"), 
          new anchor.BN(300)
        )
        .accounts({
          authority: admin.publicKey,
          globalState: globalStateKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY
        })
        .instruction()
    );
    //let simulRes = await provider.simulate(tx, [admin]);
    //console.log('simulRes =', simulRes);
    let txHash = await sendAndConfirmTransaction(provider.connection, tx, [admin]);
    console.log("Your transaction signature", txHash);
    
    let _global_state = await program.account.globalState.fetch(globalStateKey);
    console.log("global state = ", _global_state);
  });

  it("start mining", async () => {
    const [globalStateKey] = await getGlobalStatePDA(admin.publicKey);
    console.log("global state key = ", globalStateKey.toBase58());
    
    const tx = new Transaction().add(
      await program.methods
        .startMine()
        .accounts({
          authority: admin.publicKey,
          globalState: globalStateKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY
        })
        .instruction()
    );
    //let simulRes = await provider.simulate(tx, [admin]);
    //console.log('simulRes =', simulRes);
    let txHash = await sendAndConfirmTransaction(provider.connection, tx, [admin]);
    console.log("Your transaction signature", txHash);
    
    let _global_state = await program.account.globalState.fetch(globalStateKey);
    console.log("is started = ", _global_state.isStarted);
  });

  it("buy and hatch eggs", async () => {
    const [globalStateKey] = await getGlobalStatePDA(admin.publicKey);
    const [vaultKey] = await getVaultPDA();
    
    const [userStateKey] = await getUserStatePDA(user.publicKey);
    console.log("user state key = ", userStateKey.toBase58());

    // let _userStateData = await program.account.userState.fetch(userStateKey);
    // console.log("userStateData.miners = ", _userStateData.miners.toNumber());
    
    const [adminUserStateKey] = await getUserStatePDA(admin.publicKey);
    console.log("admin user state key = ", adminUserStateKey.toBase58());
    
    let globalData = await program.account.globalState.fetch(globalStateKey);
    const tx = new Transaction().add(
      await program.methods
        .buyEggs(new anchor.BN(5).mul(new anchor.BN(LAMPORTS_PER_SOL)))
        .accounts({
          user: user.publicKey,
          globalState: globalStateKey,
          treasury: globalData.treasury,
          vault: vaultKey,
          userState: userStateKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY
        })
        .instruction()
    );
    tx.add(
      await program.methods
        .hatchEggs()
        .accounts({
          user: user.publicKey,
          globalState: globalStateKey,
          vault: vaultKey,
          userState: userStateKey,
          referral: admin.publicKey,
          referralState: adminUserStateKey,
        })
        .instruction()
    );
    // tx.feePayer = user.publicKey;
    // tx.recentBlockhash = (await program.provider.connection.getLatestBlockhash()).blockhash;
    // let simulRes = await program.provider.connection.simulateTransaction(tx);
    // console.log('simulRes =', simulRes);
    
    let txHash = await sendAndConfirmTransaction(provider.connection, tx, [user]);
    console.log("Your transaction signature", txHash);
    
    let solBal = await provider.connection.getBalance(user.publicKey);
    console.log("user sol balance = ", solBal);

    let userStateData = await program.account.userState.fetch(userStateKey);
    console.log("userStateData.miners = ", userStateData.miners.toNumber());

    let tvl = await provider.connection.getBalance(vaultKey);
    console.log("TVL = ", tvl);
  })

  it("sell eggs", async () => {
    await delay(2000);
    const [globalStateKey] = await getGlobalStatePDA(admin.publicKey);
    const [vaultKey] = await getVaultPDA();
    const [userStateKey] = await getUserStatePDA(user.publicKey);
    let globalData = await program.account.globalState.fetch(globalStateKey);
    const tx = new Transaction().add(
      await program.methods
        .sellEggs()
        .accounts({
          user: user.publicKey,
          globalState: globalStateKey,
          vault: vaultKey,
          treasury: globalData.treasury,
          userState: userStateKey,
          systemProgram: SystemProgram.programId
        })
        .instruction()
    );
    // let simulRes = await provider.simulate(tx, [user]);
    // console.log('simulRes =', simulRes);
    
    let txHash = await sendAndConfirmTransaction(provider.connection, tx, [user]);
    console.log("Your transaction signature", txHash);
    
    let solBal = await provider.connection.getBalance(user.publicKey);
    console.log("user sol balance = ", solBal);

    let userStateData = await program.account.userState.fetch(userStateKey);
    console.log("userStateData.miners = ", userStateData.miners.toNumber());

    let tvl = await provider.connection.getBalance(vaultKey);
    console.log("TVL = ", tvl);
  })
});

export const airdropSol = async (
  provider: anchor.Provider,
  target: anchor.web3.PublicKey,
  lamps: number
): Promise<string> => {
  const sig: string = await provider.connection.requestAirdrop(target, lamps);
  await provider.connection.confirmTransaction(sig);
  return sig;
};

/**
 * Get PDA Account of global state
 * @param authority
 * @param programId
 * @returns
 */
 const getGlobalStatePDA = async (
  authority: PublicKey,
  programId: PublicKey = new PublicKey(SolMinerIDL.metadata.address)
) => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(GLOBAL_STATE_SEED), authority.toBuffer()],
    programId
  );
};

/**
 * Get PDA Account of vault
 * @param programId
 * @returns
 */
 const getVaultPDA = async (
  programId: PublicKey = new PublicKey(SolMinerIDL.metadata.address)
) => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(VAULT_SEED)],
    programId
  );
};

/**
 * Get PDA Account of user state
 * @param user
 * @param programId
 * @returns
 */
 const getUserStatePDA = async (
  user: PublicKey,
  programId: PublicKey = new PublicKey(SolMinerIDL.metadata.address)
) => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(USER_STATE_SEED), user.toBuffer()],
    programId
  );
};