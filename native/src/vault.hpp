#pragma once
#include <array>
#include <string>
#include <stdexcept>
#include <limits>
#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <bcrypt.h>
#else
#include <openssl/evp.h>
#include <openssl/rand.h>
#endif
namespace perekup::vault {
inline const std::string magic="PKSAVE2\n";
inline constexpr std::size_t limit=24*1024*1024;
inline std::array<unsigned char,32> key(){std::array<unsigned char,32> k={0x71,0x16,0x94,0xd3,0x39,0x88,0x24,0xb7,0x4a,0x6e,0xa1,0x5c,0xef,0x60,0x33,0x0d,0x9e,0x21,0xf4,0x8a,0xb0,0x47,0xc2,0x55,0x04,0xfa,0x6b,0x90,0xdb,0x12,0x7c,0xe8};for(std::size_t i=0;i<k.size();i++)k[i]^=static_cast<unsigned char>(0x59+i*7);return k;}
inline bool crypt(bool encrypt,const std::string& input,std::string& output){
 output.clear();if((encrypt&&(input.empty()||input.size()>limit))||(!encrypt&&(input.size()<36||input.size()>limit+36||input.compare(0,8,magic)!=0)))return false;
 auto secret=key();std::array<unsigned char,12> nonce{};std::array<unsigned char,16> tag{};
 const auto size=encrypt?input.size():input.size()-36;const auto* source=reinterpret_cast<const unsigned char*>(input.data()+(encrypt?0:36));std::string result(size,'\0');
 if(!encrypt){std::copy_n(reinterpret_cast<const unsigned char*>(input.data()+8),12,nonce.begin());std::copy_n(reinterpret_cast<const unsigned char*>(input.data()+20),16,tag.begin());}
 bool ok=false;
#ifdef _WIN32
 BCRYPT_ALG_HANDLE alg=nullptr;BCRYPT_KEY_HANDLE handle=nullptr;
 if(encrypt&&BCryptGenRandom(nullptr,nonce.data(),12,BCRYPT_USE_SYSTEM_PREFERRED_RNG)<0)return false;
 if(BCryptOpenAlgorithmProvider(&alg,BCRYPT_AES_ALGORITHM,nullptr,0)>=0){
  if(BCryptSetProperty(alg,BCRYPT_CHAINING_MODE,reinterpret_cast<PUCHAR>(const_cast<wchar_t*>(BCRYPT_CHAIN_MODE_GCM)),sizeof(BCRYPT_CHAIN_MODE_GCM),0)>=0&&BCryptGenerateSymmetricKey(alg,&handle,nullptr,0,secret.data(),32,0)>=0){
   BCRYPT_AUTHENTICATED_CIPHER_MODE_INFO auth;BCRYPT_INIT_AUTH_MODE_INFO(auth);auth.pbNonce=nonce.data();auth.cbNonce=12;auth.pbTag=tag.data();auth.cbTag=16;auth.pbAuthData=reinterpret_cast<PUCHAR>(const_cast<char*>(magic.data()));auth.cbAuthData=8;ULONG written=0;
   auto operation=encrypt?BCryptEncrypt:BCryptDecrypt;
   ok=operation(handle,const_cast<PUCHAR>(source),static_cast<ULONG>(size),&auth,nullptr,0,reinterpret_cast<PUCHAR>(result.data()),static_cast<ULONG>(result.size()),&written,0)>=0&&written==size;
  }
 }
 if(handle)BCryptDestroyKey(handle);if(alg)BCryptCloseAlgorithmProvider(alg,0);SecureZeroMemory(secret.data(),secret.size());
#else
 if(encrypt&&RAND_bytes(nonce.data(),12)!=1)return false;
 EVP_CIPHER_CTX* ctx=EVP_CIPHER_CTX_new();int written=0,tail=0,unused=0;
 if(ctx){ok=EVP_CipherInit_ex(ctx,EVP_aes_256_gcm(),nullptr,nullptr,nullptr,encrypt?1:0)==1&&EVP_CIPHER_CTX_ctrl(ctx,EVP_CTRL_GCM_SET_IVLEN,12,nullptr)==1&&EVP_CipherInit_ex(ctx,nullptr,nullptr,secret.data(),nonce.data(),-1)==1&&EVP_CipherUpdate(ctx,nullptr,&unused,reinterpret_cast<const unsigned char*>(magic.data()),8)==1&&EVP_CipherUpdate(ctx,reinterpret_cast<unsigned char*>(result.data()),&written,source,static_cast<int>(size))==1;
 if(ok&&!encrypt)ok=EVP_CIPHER_CTX_ctrl(ctx,EVP_CTRL_GCM_SET_TAG,16,tag.data())==1;
 if(ok)ok=EVP_CipherFinal_ex(ctx,reinterpret_cast<unsigned char*>(result.data())+written,&tail)==1&&std::size_t(written+tail)==size;
 if(ok&&encrypt)ok=EVP_CIPHER_CTX_ctrl(ctx,EVP_CTRL_GCM_GET_TAG,16,tag.data())==1;
 EVP_CIPHER_CTX_free(ctx);}
 OPENSSL_cleanse(secret.data(),secret.size());
#endif
 if(!ok){std::fill(result.begin(),result.end(),'\0');return false;}
 if(encrypt)output=magic+std::string(reinterpret_cast<char*>(nonce.data()),12)+std::string(reinterpret_cast<char*>(tag.data()),16)+result;else output=std::move(result);return true;
}
inline std::string seal(const std::string& plain){std::string output;if(!crypt(true,plain,output))throw std::runtime_error("Cannot encrypt game save");return output;}
inline bool open(const std::string& bytes,std::string& plain){return crypt(false,bytes,plain);}
}
