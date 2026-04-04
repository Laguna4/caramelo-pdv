import asyncio
import edge_tts

TEXT = """
Cansado de sistema feio e complicado na sua loja?
Conheça o Caramelo PDV. O sistema mais simples e bonito do Brasil.
Cadastre produtos em segundos e controle seu estoque sem dor de cabeça.
Faça vendas em dois cliques. Rápido, seguro e cem por cento online.
Pare de perder tempo. Teste agora o Caramelo PDV. Link na bio!
"""

VOICE = "pt-BR-AntonioNeural"
OUTPUT_FILE = "audio_promo_caramelo_masculino.mp3"

async def main():
    communicate = edge_tts.Communicate(TEXT, VOICE)
    await communicate.save(OUTPUT_FILE)
    print(f"Audio salvo em: {OUTPUT_FILE}")

if __name__ == "__main__":
    asyncio.run(main())
